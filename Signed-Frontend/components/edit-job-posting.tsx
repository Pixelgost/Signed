import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  TextInput,
  Keyboard,
  InputAccessoryView,
  Pressable,
  Text,
  Alert,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Fonts } from "@/constants/theme";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import AntDesign from "@expo/vector-icons/AntDesign";
import MediaUpload, { defaultMedia } from "@/components/ui/media-upload";
import Feather from "@expo/vector-icons/Feather";
import TagsInput from "@/components/ui/tags-input";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage, auth } from "@/firebaseConfig";
import type { media } from "@/components/ui/media-upload";

import axios, { AxiosError } from "axios";

import Constants from "expo-constants";

const { width } = Dimensions.get("window");

const machineIp = Constants.expoConfig?.extra?.MACHINE_IP;

const personality_options = [
  "Innovator",
  "Leader",
  "Thinker",
  "Collaborator",
];


interface EditJobPostingProps {
  postId: string;
  onSuccessfulSubmit: () => void;
}

export default function EditJobPosting({
  postId,
  onSuccessfulSubmit,
}: EditJobPostingProps) {
  const [mediaItems, setMediaItems] = useState<media[]>([defaultMedia]);
  const [companyLogo, setCompanyLogo] = useState<media>(defaultMedia);
  const [userId, setUserId] = useState<string>("");

  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const [jobTitle, setJobTitle] = useState<string>("");
  const [company, setCompany] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [jobType, setJobType] = useState<string>("");
  const [salary, setSalary] = useState<string>("");
  const [companySize, setCompanySize] = useState<string>("");
  const [personalityPreferences, setPersonalityPreferences] = useState<string[]>([]);

  const [tags, setTags] = useState<string[]>([]);
  const [preloadedTags, setPreLoadedTags] = useState<string[]>([]);
  const [jobDescription, setJobDescription] = useState<string>("");

  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  // The height of the job title input box
  // The height auto adjusts based on how many rows it takes up
  const [jobTitleInputHeight, setJobTitleInputHeight] = useState(40);

  const inputAccessoryViewID = "doneButton";
  const inputAccessoryViewIDSecondary = "doneButton2";

  const renderMedia = ({ item, index }: any) => (
    <View style={styles.slide}>
      <MediaUpload
        mediaItem={mediaItems[index]}
        onMediaSelected={async (media: media) => {
          // Immediately update the mediaItems array
          // Once deletion/insertion into the database is done, then
          // add the download link, if applicable
          setMediaItems((prev) => {
            const updated = [...prev];
            updated[index] = media;
            return updated;
          });

          if (mediaItems[index].downloadLink !== "") {
            await deleteMedia(mediaItems[index].downloadLink);
          }

          let downloadLink = "";
          if (media !== defaultMedia) {
            downloadLink = await uploadMedia(media, userId);
          }

          setMediaItems((prev) => {
            const updated = [...prev];
            const updatedMedia = { ...media, downloadLink };
            updated[index] = updatedMedia;
            return updated;
          });

          return media.fileType === "pdf" ? downloadLink : "";
        }}
        onLogoSelected={async (media: media) => {
          setCompanyLogo(media);
          if (media.downloadLink !== "") {
            await deleteMedia(mediaItems[index].downloadLink);
          }

          let downloadLink = "";
          if (media !== defaultMedia) {
            downloadLink = await uploadMedia(media, userId);
          }

          setCompanyLogo(() => {
            const updatedMedia = { ...media, downloadLink };
            return updatedMedia;
          });
        }}
        logo={companyLogo}
      />
    </View>
  );

  useEffect(() => {
    if (!mediaItems.includes(defaultMedia)) {
      setMediaItems((prev) => [...prev, defaultMedia]);
    }
  }, [mediaItems]);

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const handleEdit = async () => {
    const cleanedMediaItems = mediaItems.filter(
      (media) => media.fileSize !== 0
    );

    const cleanedCompanyLogo = companyLogo === defaultMedia ? [] : companyLogo;

    let request = {
      media_items: cleanedMediaItems,
      company_logo: cleanedCompanyLogo,
      job_title: jobTitle,
      company: company,
      location: location,
      job_type: jobType,
      salary: salary,
      company_size: companySize,
      tags: tags,
      job_description: jobDescription,
      personality_preferences: personalityPreferences,
      posted_by: userId,
      is_edit: true,
      edit_id: postId,
    };

    let missingFields = [];

    if (jobTitle === "") {
      missingFields.push("Job Title");
    }
    if (company === "") {
      missingFields.push("Company");
    }
    if (location === "") {
      missingFields.push("Location");
    }
    if (jobType === "") {
      missingFields.push("Job Type");
    }

    if (missingFields.length !== 0) {
      Alert.alert(
        "Missing Fields",
        `Please fill in at least the following fields: ${missingFields.join(
          "\n"
        )}`
      );
      return;
    }

    await axios
      .post(
        `http://${machineIp}:8000/api/v1/users/create-job-posting/`,
        request
      )
      .then((response: { data: any }) => {
        console.log("Success:", response.data);

        onSuccessfulSubmit();
      })
      .catch((error: AxiosError) => {
        console.error("Error details:", error);
        alert(`Error: ${error.message}`);
      });
  };

  const uriToBlob = async (uri: string) => {
    const response = await fetch(uri);
    return await response.blob();
  };

  async function uploadMedia(media: media, userId: string) {
    try {
      const blob = await uriToBlob(media.uri);

      let category = "";

      if (["png", "jpg"].includes(media.fileType)) {
        category = "images";
      } else if (["mp4", "mov"].includes(media.fileType)) {
        category = "videos";
      } else if (["pdf"].includes(media.fileType)) {
        category = "pdfs";
      }

      if (category === "") {
        return "";
      }

      const storageRef = ref(
        storage,
        `${category}/${userId}/${Date.now()}.${media.fileType}`
      );

      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error("Upload failed:", error);
      throw error;
    }
  }

  async function deleteMedia(downloadURL: string) {
    try {
      const fileRef = ref(storage, downloadURL);
      await deleteObject(fileRef);
    } catch (error) {
      console.error("Delete failed:", error);
      throw error;
    }
  }

  useEffect(() => {
    const fetchPosting = async () => {
      const API_ENDPOINT = `http://${machineIp}:8000/api/v1/users/get-job-postings/?filters={"id": "${postId}"}`;
      console.log(API_ENDPOINT);
      return axios
        .get(API_ENDPOINT)
        .then((response: { data: any }) => {
          const posting = response.data.job_postings[0];

          console.log(posting);

          setJobTitle(posting.job_title);
          setCompany(posting.company);
          setLocation(posting.location);
          setJobType(posting.job_type);
          setSalary(posting.salary);
          setCompanySize(posting.company_size);
          setJobDescription(posting.job_description);
          setPersonalityPreferences(posting.personality_preferences || []);

          let loadedTags: string[] = [];
          posting.tags.forEach((tag: string) => {
            loadedTags.push(tag);
          });
          setTags(loadedTags);
          setPreLoadedTags(loadedTags);

          let loadedMedia: media[] = [];
          posting.media_items.forEach((media: any) => {
            const mediaItem: media = {
              fileType: media.file_type,
              fileSize: media.file_size,
              fileName: media.file_name,
              uri: media.download_link,
              downloadLink: media.download_link,
            };
            loadedMedia.push(mediaItem);
          });

          setMediaItems(loadedMedia);

          if (posting.company_logo) {
            const mediaItem: media = {
              fileType: posting.company_logo.file_type,
              fileSize: posting.company_logo.file_size,
              fileName: posting.company_logo.file_name,
              uri: posting.company_logo.download_link,
              downloadLink: posting.company_logo.download_link,
            };
            setCompanyLogo(mediaItem);
          }

          setUserId(posting.posted_by.user_id);
        })
        .catch((error: AxiosError) => {
          console.error(`Error fetching posting ${postId}:`, error.message);
        });
    };

    fetchPosting();
  }, []);

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Edit Job Posting
        </ThemedText>
      </ThemedView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={styles.mediaSection}>
          <Animated.ScrollView
            scrollEventThrottle={16}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <Animated.View
              style={{
                height: scrollY.interpolate({
                  inputRange: [0, 1000],
                  outputRange: [450, -400],
                  extrapolate: "clamp",
                }),
              }}
            >
              <FlatList
                data={mediaItems}
                keyExtractor={(item, index) => index.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                renderItem={renderMedia}
                onScroll={onScroll}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewConfigRef.current}
                style={styles.carousel}
              />

              <View style={styles.dotsContainer}>
                {mediaItems.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      currentIndex === index ? styles.activeDot : null,
                    ]}
                  />
                ))}
              </View>
            </Animated.View>

            {/* For some reason it would not allow the same InputAccessoryView to be attached 
                to two different inputs, so these are duplicated */}
            <InputAccessoryView nativeID={inputAccessoryViewID}>
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                }}
                style={({ pressed }) => [
                  styles.doneButton,
                  pressed && { backgroundColor: "#87dfffff" },
                ]}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </Pressable>
            </InputAccessoryView>

            <InputAccessoryView nativeID={inputAccessoryViewIDSecondary}>
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                }}
                style={({ pressed }) => [
                  styles.doneButton,
                  pressed && { backgroundColor: "#87dfffff" },
                ]}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </Pressable>
            </InputAccessoryView>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.jobTitleInput, { height: jobTitleInputHeight }]}
                value={jobTitle}
                onChangeText={setJobTitle}
                placeholder="Job Title"
                placeholderTextColor="#999"
                multiline
                onContentSizeChange={(e) =>
                  setJobTitleInputHeight(e.nativeEvent.contentSize.height)
                }
                textAlignVertical="top"
                inputAccessoryViewID={inputAccessoryViewID}
                onFocus={() => {
                  scrollY.setValue(
                    mediaItems[currentIndex] === defaultMedia ? 250 : 300
                  );
                }}
                onBlur={() => {
                  scrollY.setValue(0);
                }}
              />

              <TextInput
                style={styles.companyInput}
                value={company}
                onChangeText={setCompany}
                placeholder="Company"
                placeholderTextColor="#999"
                returnKeyType="done"
              />

              <View style={styles.groupedInputsContainer}>
                <View style={styles.row}>
                  <View style={styles.iconContainer}>
                    <FontAwesome6 name="location-dot" size={20} color="#999" />
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={location}
                    onChangeText={setLocation}
                    placeholder="Location"
                    placeholderTextColor="#999"
                    returnKeyType="done"
                  />
                </View>

                <View style={styles.row}>
                  <View style={styles.iconContainer}>
                    <AntDesign name="clock-circle" size={20} color="#999" />
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={jobType}
                    onChangeText={setJobType}
                    placeholder="Job Type"
                    placeholderTextColor="#999"
                    returnKeyType="done"
                  />

                  <View style={styles.iconContainer}>
                    <Feather name="dollar-sign" size={20} color="#999" />
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={salary}
                    onChangeText={setSalary}
                    placeholder="Salary"
                    placeholderTextColor="#999"
                    returnKeyType="done"
                  />
                </View>
                <View style={styles.row}>
                  <View style={styles.iconContainer}>
                    <MaterialIcons name="people" size={20} color="#999" />
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={companySize}
                    onChangeText={setCompanySize}
                    placeholder="Company Size"
                    placeholderTextColor="#999"
                    returnKeyType="done"
                  />
                </View>
              </View>

              <TagsInput
                onUpdateTags={(tags: string[]) => {
                  setTags(tags);
                }}
                loadedTags={preloadedTags}
              />

              <TextInput
                style={[styles.jobDescriptionInput]}
                value={jobDescription}
                onChangeText={setJobDescription}
                inputAccessoryViewID={inputAccessoryViewIDSecondary}
                placeholder="Job Description"
                placeholderTextColor="#999"
                multiline
              />

              <View style={{ marginTop: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
                  Preferred Personality Types
                </Text>

                {personality_options.map((type) => {
                  const selected = personalityPreferences.includes(type);

                  return (
                    <Pressable
                      key={type}
                      onPress={() => {
                        setPersonalityPreferences((prev) =>
                          selected ? prev.filter((t) => t !== type) : [...prev, type]
                        );
                      }}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        marginVertical: 4,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: selected ? "#333" : "#bbb",
                        backgroundColor: selected ? "#d1ffd8" : "#fff",
                      }}
                    >
                      <Text style={{ color: "#000" }}>{type}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                onPress={handleEdit}
                style={({ pressed }) => [
                  styles.submitButton,
                  pressed && { backgroundColor: "#00ff04ff" },
                ]}
              >
                <Text>Done</Text>
              </Pressable>
            </View>
          </Animated.ScrollView>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
    paddingTop: 50,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 28,
    fontWeight: "bold",
  },
  carousel: {
    flexGrow: 0,
  },
  slide: {
    width: width - 40,
    flex: 1,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ccc",
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: "#333",
  },
  mediaSection: {
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
    overflow: "hidden",
    height: "90%",
  },
  inputContainer: {
    paddingHorizontal: 12,
    width: "100%",
  },
  jobTitleInput: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 28,
    flexShrink: 1,
    color: "#000000ff",
  },
  companyInput: {
    height: 35,
    paddingHorizontal: 12,
    fontSize: 20,
    color: "#8d8d8dff",
  },
  locationInput: {
    height: 35,
    paddingHorizontal: 12,
    fontSize: 20,
    color: "#000000ff",
  },
  doneButton: {
    height: 40,
    paddingHorizontal: 16,
    backgroundColor: "#c1eeffff",
    marginVertical: 5,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  doneButtonText: {
    color: "#000",
    fontSize: 16,
  },
  groupedInputsContainer: {
    marginTop: 24,
    flexDirection: "column",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  iconContainer: {
    width: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  textInput: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    color: "#000",
  },
  jobDescriptionInput: {
    height: 150,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 16,
    color: "#000",
  },
  submitButton: {
    paddingVertical: 10,
    marginVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#7bff7dff",
    borderRadius: 6,
    alignItems: "center",
  },
  cancelButton: {
    paddingVertical: 10,
    marginVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#fa8561ff",
    borderRadius: 6,
    alignItems: "center",
  },
});
