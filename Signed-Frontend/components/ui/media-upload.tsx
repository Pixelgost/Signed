import { useEffect, useRef, useState } from "react";

import {
  StyleSheet,
  View,
  Text,
  Alert,
  ActionSheetIOS,
  Platform,
  Pressable,
  Animated,
  ActivityIndicator,
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { WebView } from "react-native-webview";

import { Video } from "expo-av";

// 20 MB
const MAX_FILE_SIZE = 1024 * 1024 * 20;

type MediaUploadProps = {
  onMediaSelected: (media: media) => Promise<string> | void;
  onLogoSelected: (media: media) => void;
  logo: media;
  mediaItem?: media; // used for edit to immediately load media items, if they exist
};

export type media = {
  fileType: string;
  fileSize: number;
  fileName: string;
  uri: string;
  downloadLink: string;
};

export const defaultMedia = {
  downloadLink: "",
  fileType: "",
  fileSize: 0,
  fileName: "",
  uri: "",
};

export default function MediaUpload({
  onMediaSelected,
  onLogoSelected,
  logo,
  mediaItem,
}: MediaUploadProps) {
  const [image, setImage] = useState<string | null>(null);
  const [video, setVideo] = useState<string | null>(null);

  // This is a link to the pdf stored in Firebase
  const [pdf, setPdf] = useState<string | void>();

  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);

  const [companyLogo, setCompanyLogo] = useState<string>(logo.uri);

  const videoRef = useRef<Video>(null);

  useEffect(() => {
    setCompanyLogo(logo.uri);
  }, [logo]);

  useEffect(() => {
    if (mediaItem) {
      if (["png", "jpg"].includes(mediaItem.fileType)) {
        setImage(mediaItem.downloadLink);
        setVideo(null);
      } else if (["mp4", "mov"].includes(mediaItem.fileType)) {
        setVideo(mediaItem.downloadLink);
        setImage(null);
      } else if (["pdf"].includes(mediaItem.fileType)) {
        setPdf(mediaItem.downloadLink);
        setImage(null);
        setVideo(null);
      }
    }
  }, []);
  
  const [permissionResponse, requestPermission] =
    ImagePicker.useMediaLibraryPermissions();

  const pickLogo = async () => {
    if (!permissionResponse || permissionResponse.status !== "granted") {
      const permissionResult = await requestPermission();
      if (permissionResult.status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Signed does not have permission to access your photo library. Grant permissions within settings to enable this feature."
        );
        return;
      }
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const extension = uri.split(".").pop() || "";

      const fileSize = result.assets[0].fileSize || 0;
      const fileName = result.assets[0].fileName || "";

      handleLogoPreview({
        fileType: extension.toLowerCase(),
        fileSize: fileSize,
        fileName: fileName,
        uri: uri,
        downloadLink: "",
      });
    }
  };

  const pickImageOrVideo = async () => {
    if (!permissionResponse || permissionResponse.status !== "granted") {
      const permissionResult = await requestPermission();
      if (permissionResult.status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Signed does not have permission to access your photo library. Grant permissions within settings to enable this feature."
        );
        return;
      }
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const extension = uri.split(".").pop() || "";

      const fileSize = result.assets[0].fileSize || 0;
      const fileName = result.assets[0].fileName || "";

      handleMediaPreview({
        fileType: extension.toLowerCase(),
        fileSize: fileSize,
        fileName: fileName,
        uri: uri,
        downloadLink: "",
      });
    }
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const extension = uri.split(".").pop() || "";
      const fileSize = result.assets[0].size || 0;
      const fileName = result.assets[0].name || "";

      handleMediaPreview({
        fileType: extension.toLowerCase(),
        fileSize: fileSize,
        fileName: fileName,
        uri: uri,
        downloadLink: "",
      });
    }
  };

  const handleMediaPreview = async (media: media) => {
    if (media.fileSize > MAX_FILE_SIZE) {
      Alert.alert(
        "Error",
        `File is too large (> ${MAX_FILE_SIZE / 1024 / 1024} MB)`
      );
      media = defaultMedia;
      return;
    }
    if (["png", "jpg"].includes(media.fileType)) {
      setImage(media.uri);
      setVideo(null);
    } else if (["mp4", "mov"].includes(media.fileType)) {
      setVideo(media.uri);
      setImage(null);
    } else if (["pdf"].includes(media.fileType)) {
      setIsLoadingPdf(true);
      setImage(null);
      setVideo(null);
    } else {
      Alert.alert("Error", `File type ${media.fileType} not supported.`);
      media = defaultMedia;
      return;
    }

    if (onMediaSelected) {
      if (media.fileType === "pdf") {
        const downloadLink = await onMediaSelected(media);
        setPdf(downloadLink);

        setIsLoadingPdf(false);
      } else {
        await onMediaSelected(media);
      }
    }
  };

  const handleLogoPreview = (media: media) => {
    if (media.fileSize > MAX_FILE_SIZE) {
      Alert.alert(
        "Error",
        `File is too large (> ${MAX_FILE_SIZE / 1024 / 1024} MB)`
      );
      media = defaultMedia;
      return;
    }
    if (["png", "jpg"].includes(media.fileType)) {
      setCompanyLogo(media.uri);
    } else {
      Alert.alert("Error", `File type ${media.fileType} not supported.`);
      media = defaultMedia;
      return;
    }

    if (onLogoSelected) {
      onLogoSelected(media);
    }
  };

  const clearSelection = () => {
    setImage(null);
    setVideo(null);
    setPdf();
    if (onMediaSelected) {
      onMediaSelected(defaultMedia);
    }
  };

  const showMediaOptions = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Pick Image/Video", "Pick File"],
          cancelButtonIndex: 0,
          title: "Select Media Type",
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            pickImageOrVideo();
          } else if (buttonIndex === 2) {
            pickFile();
          }
        }
      );
    }
  };

  return (
    <>
      <View style={{ height: 350 }}>
        <Pressable
          onPress={!image && !video && !pdf ? showMediaOptions : () => {}}
          style={{ width: "100%", flex: 1 }}
        >
          {image ? (
            <Animated.Image
              source={{ uri: image }}
              style={[styles.image, { height: 350, width: "100%" }]}
              resizeMode="cover"
            />
          ) : video ? (
            <>
              <Video
                ref={videoRef}
                source={{ uri: video }}
                style={[styles.image, { height: 350, width: "100%" }]}
                useNativeControls
                isLooping
              />
            </>
          ) : pdf ? (
            isLoadingPdf ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ffffff" />
              </View>
            ) : (
              <WebView source={{ uri: pdf }} style={{ flex: 1 }} />
            )
          ) : (
            <Animated.View
              style={[styles.placeholder, { height: 350, width: "100%" }]}
            >
              <Text style={styles.uploadText}>Upload Media or File</Text>
              <Text style={styles.uploadText}>
                Empty slots will be deleted.
              </Text>
            </Animated.View>
          )}

          <Pressable onPress={pickLogo}>
            <View style={styles.companyLogoContainer}>
              {companyLogo === "" ? (
                <Text style={styles.companyLogoText}>Add Company Logo</Text>
              ) : (
                <Animated.Image
                  source={{ uri: companyLogo }}
                  style={[
                    styles.image,
                    { height: "100%", width: "100%", borderRadius: 5 },
                  ]}
                  resizeMode="cover"
                />
              )}
            </View>
          </Pressable>
        </Pressable>
      </View>

      {image || video || pdf ? (
        <View style={styles.buttonRow}>
          <Pressable
            onPress={showMediaOptions}
            style={({ pressed }) => [
              styles.editButton,
              pressed && { backgroundColor: "#48ceffff" },
            ]}
          >
            <Text style={styles.editButtonText}>Edit Selection</Text>
          </Pressable>
          <Pressable
            onPress={clearSelection}
            style={({ pressed }) => [
              styles.clearButton,
              pressed && { backgroundColor: "#ff7146ff" },
            ]}
          >
            <Text style={styles.clearButtonText}>Clear Selection</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ height: 50 }} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  selectionContainer: {
    width: "100%",
    overflow: "hidden",
    alignItems: "center",
    gap: 15,
  },
  imageContainer: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderColor: "black",
    borderRadius: 2,
  },
  clearButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#ff9a7bff",
    marginVertical: 5,
    borderRadius: 6,
    alignItems: "center",
  },
  clearButtonText: {
    color: "#000",
    fontSize: 16,
  },
  editButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#86dfffff",
    marginVertical: 5,
    borderRadius: 6,
    alignItems: "center",
  },
  editButtonText: {
    color: "#000",
    fontSize: 16,
  },
  placeholder: {
    width: "100%",
    backgroundColor: "#ececec",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadText: {
    fontSize: 18,
    color: "#888",
  },
  image: {
    width: "100%",
  },
  mediaLabel: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#212529",
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 10,
    marginHorizontal: 25,
  },
  companyLogoContainer: {
    height: 75,
    width: 75,
    borderColor: "#000",
    borderWidth: 3,
    borderRadius: 10,
    zIndex: 10,
    position: "absolute",
    backgroundColor: "#eee",
    left: 25,
    top: -100,
    justifyContent: "center",
    alignItems: "center",
  },
  companyLogoText: {
    color: "#000",
    fontSize: 16,
    textAlign: "center",
  },
  pdf: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
});
