import os
import re
import tempfile
from typing import List, Optional, Dict

from doctr.io import DocumentFile
from doctr.models import ocr_predictor
from docx import Document as DocxDocument
import spacy
from PyPDF2 import PdfReader

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.http import JsonResponse

from accounts.firebase_auth.firebase_authentication import FirebaseAuthentication
from accounts.models import ApplicantProfile
from accounts.serializers import ApplicantProfileSerializer

OCR_MODEL = ocr_predictor(pretrained=True)
NLP = spacy.load("en_core_web_sm")

# regexes
EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[A-Za-z]{2,}", re.I)
PHONE_RE = re.compile(r"(\+?\d{1,3}?[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?[\d\-.\s]{7,15}\d")
YEARS_RE = re.compile(r"(?P<years>\d+(?:\.\d+)?)\s+(?:years|yrs|y)\b", re.I)
YEAR_RANGE_RE = re.compile(r"\b((?:19|20)\d{2})\b")

COMMON_SKILLS = {
    "python","django","flask","react","reactjs","javascript","typescript",
    "aws","gcp","azure","docker","kubernetes","sql","postgresql","mysql",
    "git","linux","html","css","tensorflow","pytorch","pandas","numpy",
    "opencv","c++","c","java","bash","rest",
}

SCHOOL_KEYWORDS = {"university","college","institute","school","academy"}

# extractors
def extract_text_from_pdf(path: str) -> str:
    # native text extraction
    try:
        reader = PdfReader(path)
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        cleaned = text.strip()
        if cleaned:
            return cleaned
    except:
        pass

    # fallback to OCR
    doc = DocumentFile.from_pdf(path)
    result = OCR_MODEL(doc)

    lines = []
    for page in result.pages:
        for block in page.blocks:
            for line in block.lines:
                text = getattr(line, "value", getattr(line, "text", ""))
                if text:
                    lines.append(text)

    return "\n".join(lines)


def extract_text_from_docx(path: str) -> str:
    doc = DocxDocument(path)
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


def extract_text_from_txt(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def normalize_text(t: str) -> str:
    return re.sub(r"\n{2,}", "\n", t).strip()


def extract_emails(t: str) -> List[str]:
    return list({m.group(0) for m in EMAIL_RE.finditer(t)})


def extract_phones(t: str) -> List[str]:
    matches = []
    for m in PHONE_RE.finditer(t):
        cleaned = re.sub(r"[^\d+]", "", m.group(0))
        if len(cleaned) >= 7:
            matches.append(cleaned)

    return list(dict.fromkeys(matches))


def extract_names_and_companies(t: str) -> Dict[str, List[str]]:
    doc = NLP(t)

    names, orgs = [], []

    for ent in doc.ents:
        if ent.label_ == "PERSON" and len(ent.text.split()) <= 4:
            names.append(ent.text.strip())
        elif ent.label_ in ("ORG", "COMPANY"):
            orgs.append(ent.text.strip())

    def uniq(vals):
        out, seen = [], set()
        for v in vals:
            key = v.lower()
            if key not in seen:
                seen.add(key)
                out.append(v)
        return out

    return {"names": uniq(names), "companies": uniq(orgs)}


def extract_education_and_degree(t: str) -> Dict[str, Optional[str]]:
    school = None
    degree = None

    for line in t.splitlines():
        low = line.lower()

        if not school and any(k in low for k in SCHOOL_KEYWORDS):
            school = line.strip()

        if not degree and re.search(r"\b(bachelor|master|b\.a|b\.s|bsc|ba|bs|ms|m\.sc|phd|associate)\b", low):
            degree = line.strip()

    return {"school": school, "degree": degree}


def extract_skills(t: str) -> List[str]:
    found = set()

    # skills section
    pattern = re.compile(
        r"(skills|technical skills|technical competencies)\s*[:\-]?\s*((?:.|\n){0,400})",
        re.I,
    )

    for m in pattern.finditer(t):
        block = m.group(2)
        for chunk in re.split(r"[\n,;•]+", block):
            tok = chunk.strip().lower()
            if len(tok) > 1:
                for w in tok.split():
                    if w in COMMON_SKILLS:
                        found.add(w)

                if any(s in tok for s in COMMON_SKILLS):
                    found.add(tok)

    # global fallback
    for w in re.findall(r"[A-Za-z\+\#\-\.\+]{2,}", t):
        lw = w.lower()
        if lw in COMMON_SKILLS:
            found.add(lw)

    return sorted({s.capitalize() for s in found})


def extract_experience_text_and_years(t: str) -> Dict[str, Optional[object]]:
    total = None
    snippets = []

    matches = YEARS_RE.findall(t)
    if matches:
        try:
            nums = [float(m) for m in matches]
            total = max(nums)
        except:
            total = None

    for m in re.finditer(
        r"(experience|work experience|professional experience|summary|employment history)\s*[:\-]?\s*(.*)",
        t, re.I
    ):
        snippet = m.group(2)
        lines = t.splitlines()
        try:
            idx = next(i for i, l in enumerate(lines) if snippet in l)
            snippets.append("\n".join(lines[idx: idx + 8]))
        except:
            snippets.append(snippet)

    years = sorted({int(y) for y in YEAR_RANGE_RE.findall(t)})
    if not total and len(years) >= 2:
        total = float(max(years) - min(years))

    return {"experience_text": "\n\n".join(snippets) if snippets else None,
            "total_experience": total}

class ResumeSubmitView(APIView):
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            profile = ApplicantProfile.objects.get(user=request.user)
        except ApplicantProfile.DoesNotExist:
            return JsonResponse({"error": "ApplicantProfile not found"}, status=404)

        uploaded = request.FILES.get("file")

        # Detect corrupted/ghost upload
        if uploaded and uploaded.size == 0:
            uploaded = None

        if uploaded:
            profile.resume_file = uploaded
            profile.save()
            filename = uploaded.name
            file_obj = uploaded
        else:
            if not profile.resume_file:
                return JsonResponse({"error": "No resume on file"}, status=400)

            filename = os.path.basename(profile.resume_file.name)
            file_obj = profile.resume_file

        suffix = os.path.splitext(filename)[1].lower()

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            for chunk in file_obj.chunks():
                tmp.write(chunk)
            temp_path = tmp.name

        # extract text
        try:
            if suffix == ".pdf":
                raw_text = extract_text_from_pdf(temp_path)
            elif suffix == ".docx":
                raw_text = extract_text_from_docx(temp_path)
            elif suffix == ".txt":
                raw_text = extract_text_from_txt(temp_path)
            else:
                raw_text = extract_text_from_pdf(temp_path)
        except Exception as e:
            os.remove(temp_path)
            return JsonResponse({"error": "Text extraction failed", "details": str(e)}, status=500)
        finally:
            try:
                os.remove(temp_path)
            except:
                pass

        raw_text = normalize_text(raw_text)

        # extract structured fields
        emails = extract_emails(raw_text)
        phones = extract_phones(raw_text)
        ner = extract_names_and_companies(raw_text)
        edu = extract_education_and_degree(raw_text)
        skills = extract_skills(raw_text)
        exp = extract_experience_text_and_years(raw_text)

        # build update 
        data_to_update = {
            "bio": exp.get("experience_text") or None,
            "skills": ", ".join(skills) if skills else None,
            "phone": phones[0] if phones else None,
            "email": emails[0] if emails else None,
        }


        if edu.get("school"):
            data_to_update["school"] = edu["school"]
        if edu.get("degree"):
            data_to_update["major"] = edu["degree"]

        # save to the database
        serializer = ApplicantProfileSerializer(profile, data=data_to_update, partial=True)

        if not serializer.is_valid():
            return JsonResponse({"errors": serializer.errors}, status=400)

        serializer.save()
        print("DEBUG RAW TEXT:", raw_text[:500])

        return JsonResponse({
            "parsed": {
                "names": ner["names"],
                "companies": ner["companies"],
                "emails": emails,
                "phones": phones,
                "skills": skills,
                "school": edu["school"],
                "degree": edu["degree"],
                "experience_text": exp["experience_text"],
                "total_experience": exp["total_experience"],
            },
            "profile": serializer.data,
            "raw_text_preview": raw_text[:1500],
        }, status=200)
