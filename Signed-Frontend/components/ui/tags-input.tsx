import React, { useEffect, useState } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";

type tagsInputProps = {
  onUpdateTags: (tags: string[]) => void;
  loadedTags?: string[];
};

export default function TagsInput({
  onUpdateTags,
  loadedTags,
}: tagsInputProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [text, setText] = useState("");

  const addTag = () => {
    const trimmed = text.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setText("");
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  useEffect(() => {
    onUpdateTags(tags);
  }, [onUpdateTags, tags]);

  useEffect(() => {
    if (loadedTags) {
      setTags(loadedTags);
    }
  }, [loadedTags]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Add Tags"
        placeholderTextColor={"#999"}
        value={text}
        onChangeText={setText}
        onSubmitEditing={addTag}
        returnKeyType="done"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tagsContainer}
      >
        {tags.map((tag, index) => (
          <View key={index} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
            <TouchableOpacity onPress={() => removeTag(index)}>
              <Text style={styles.removeText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginHorizontal: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#999",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: "row",
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eee",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  tagText: {
    fontSize: 14,
    color: "#333",
  },
  removeText: {
    fontSize: 16,
    color: "#999",
    marginLeft: 6,
  },
});