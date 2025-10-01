import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import {
  Mic,
  MicOff,
  Save,
  ChevronRight,
  ChevronLeft,
} from "lucide-react-native";

interface FormField {
  id: string;
  label: string;
  value: string;
  placeholder: string;
}

interface CategoryInspectionProps {
  category?: string;
  initialData?: any;
  onComplete?: (categoryData: {
    category: string;
    fields: FormField[];
  }) => void;
  onCancel?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  isLastCategory?: boolean;
  isFirstCategory?: boolean;
}

const CategoryInspection = ({
  category = "Exterior",
  initialData = {},
  onComplete = () => {},
  onCancel = () => {},
  onNext = () => {},
  onPrevious = () => {},
  isLastCategory = false,
  isFirstCategory = false,
}: CategoryInspectionProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [formFields, setFormFields] = useState<FormField[]>(
    getCategoryFields(category),
  );

  // Update form fields when category changes
  useEffect(() => {
    const newFields = getCategoryFields(category);
    // Merge with any existing data for this category
    if (initialData && initialData.fields) {
      const mergedFields = newFields.map((field) => {
        const existingField = initialData.fields.find(
          (f: FormField) => f.id === field.id,
        );
        return existingField ? { ...field, value: existingField.value } : field;
      });
      setFormFields(mergedFields);
    } else {
      setFormFields(newFields);
    }
  }, [category, initialData]);

  const handleRecordToggle = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      setIsTranscribing(true);

      // Simulate AI transcription
      setTimeout(() => {
        setIsTranscribing(false);
        // Simulate AI filling out the form
        const updatedFields = formFields.map((field) => ({
          ...field,
          value:
            field.value ||
            `Sample ${field.label.toLowerCase()} data from voice recording`,
        }));
        setFormFields(updatedFields);
      }, 2000);
    } else {
      // Start recording
      setIsRecording(true);
    }
  };

  const handleFieldChange = (id: string, value: string) => {
    const updatedFields = formFields.map((field) =>
      field.id === id ? { ...field, value } : field,
    );
    setFormFields(updatedFields);
  };

  const handleSave = () => {
    onComplete({ category, fields: formFields });
    // Go back to the main inspection form after saving
    onCancel();
  };

  const handleNext = () => {
    // Auto-save before moving to next category
    onComplete({ category, fields: formFields });
    onNext();
  };

  const handlePrevious = () => {
    // Auto-save before moving to previous category
    onComplete({ category, fields: formFields });
    onPrevious();
  };

  return (
    <View className="flex-1 bg-white p-4 w-[474px] h-[838px] w-[459px] h-[798px]">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-2xl font-bold">{category} Inspection</Text>
      </View>
      <ScrollView className="flex-1">
        {formFields.map((field) => (
          <View key={field.id} className="mb-4">
            <Text className="text-sm font-medium mb-1">{field.label}</Text>
            <TextInput
              className="border border-gray-300 rounded-md p-3 bg-gray-50"
              value={field.value}
              onChangeText={(text) => handleFieldChange(field.id, text)}
              placeholder={field.placeholder}
              multiline={field.label.includes("Notes")}
              numberOfLines={field.label.includes("Notes") ? 4 : 1}
            />
          </View>
        ))}
      </ScrollView>
      <View className="mt-4 bg-gray-100 p-4 rounded-lg">
        <Text className="text-center mb-2 font-medium">
          {isRecording
            ? "Recording... Speak clearly"
            : isTranscribing
              ? "Transcribing voice to text..."
              : "Tap to record voice notes"}
        </Text>

        <TouchableOpacity
          onPress={handleRecordToggle}
          className={`p-4 rounded-full ${isRecording ? "bg-red-500" : "bg-blue-500"} self-center`}
          disabled={isTranscribing}
        >
          {isTranscribing ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : isRecording ? (
            <MicOff color="#ffffff" size={24} />
          ) : (
            <Mic color="#ffffff" size={24} />
          )}
        </TouchableOpacity>

        <Text className="text-xs text-center mt-2 text-gray-500">
          {isRecording
            ? "Tap to stop recording"
            : isTranscribing
              ? "Processing your voice notes"
              : "AI will automatically fill form fields based on your voice notes"}
        </Text>
      </View>
      <View className="flex-row justify-between mt-4">
        <TouchableOpacity
          onPress={handlePrevious}
          className={`flex-row items-center ${isFirstCategory ? "opacity-50" : ""}`}
          disabled={isFirstCategory}
        >
          <ChevronLeft
            size={20}
            color={isFirstCategory ? "#9ca3af" : "#3b82f6"}
          />
          <Text
            className={`${isFirstCategory ? "text-gray-400" : "text-blue-500"} ml-1`}
          >
            Previous
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSave}
          className="bg-green-500 px-4 py-2 rounded-md flex-row items-center"
        >
          <Save size={18} color="#ffffff" />
          <Text className="text-white ml-1">Save</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNext}
          className={`flex-row items-center ${isLastCategory ? "opacity-50" : ""}`}
          disabled={isLastCategory}
        >
          <Text
            className={`${isLastCategory ? "text-gray-400" : "text-blue-500"} mr-1`}
          >
            Next
          </Text>
          <ChevronRight
            size={20}
            color={isLastCategory ? "#9ca3af" : "#3b82f6"}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Helper function to get fields based on category
function getCategoryFields(category: string): FormField[] {
  switch (category) {
    case "Exterior":
      return [
        {
          id: "ext1",
          label: "Roof Condition",
          value: "",
          placeholder: "Describe roof condition",
        },
        {
          id: "ext2",
          label: "Siding Type",
          value: "",
          placeholder: "Type of siding",
        },
        {
          id: "ext3",
          label: "Foundation Type",
          value: "",
          placeholder: "Type of foundation",
        },
        {
          id: "ext4",
          label: "Window Condition",
          value: "",
          placeholder: "Describe window condition",
        },
        {
          id: "ext5",
          label: "Exterior Notes",
          value: "",
          placeholder: "Additional notes about exterior",
        },
      ];
    case "Interior":
      return [
        {
          id: "int1",
          label: "Floor Type",
          value: "",
          placeholder: "Type of flooring",
        },
        {
          id: "int2",
          label: "Wall Condition",
          value: "",
          placeholder: "Describe wall condition",
        },
        {
          id: "int3",
          label: "Ceiling Condition",
          value: "",
          placeholder: "Describe ceiling condition",
        },
        {
          id: "int4",
          label: "Interior Notes",
          value: "",
          placeholder: "Additional notes about interior",
        },
      ];
    case "HVAC":
      return [
        {
          id: "hvac1",
          label: "System Type",
          value: "",
          placeholder: "Type of HVAC system",
        },
        {
          id: "hvac2",
          label: "Age of System",
          value: "",
          placeholder: "Approximate age",
        },
        {
          id: "hvac3",
          label: "Condition",
          value: "",
          placeholder: "Describe condition",
        },
        {
          id: "hvac4",
          label: "HVAC Notes",
          value: "",
          placeholder: "Additional notes about HVAC",
        },
      ];
    case "Plumbing":
      return [
        {
          id: "plumb1",
          label: "Pipe Material",
          value: "",
          placeholder: "Type of pipes",
        },
        {
          id: "plumb2",
          label: "Water Heater Type",
          value: "",
          placeholder: "Type of water heater",
        },
        {
          id: "plumb3",
          label: "Water Heater Age",
          value: "",
          placeholder: "Approximate age",
        },
        {
          id: "plumb4",
          label: "Plumbing Notes",
          value: "",
          placeholder: "Additional notes about plumbing",
        },
      ];
    case "Electrical":
      return [
        {
          id: "elec1",
          label: "Panel Type",
          value: "",
          placeholder: "Type of electrical panel",
        },
        {
          id: "elec2",
          label: "Amperage",
          value: "",
          placeholder: "Amperage rating",
        },
        {
          id: "elec3",
          label: "Wiring Type",
          value: "",
          placeholder: "Type of wiring",
        },
        {
          id: "elec4",
          label: "Electrical Notes",
          value: "",
          placeholder: "Additional notes about electrical",
        },
      ];
    case "Hazards":
      return [
        {
          id: "haz1",
          label: "Mold Present",
          value: "",
          placeholder: "Yes/No and details",
        },
        {
          id: "haz2",
          label: "Asbestos Suspected",
          value: "",
          placeholder: "Yes/No and details",
        },
        {
          id: "haz3",
          label: "Lead Paint Suspected",
          value: "",
          placeholder: "Yes/No and details",
        },
        {
          id: "haz4",
          label: "Other Hazards",
          value: "",
          placeholder: "Describe any other hazards",
        },
      ];
    case "Other":
      return [
        {
          id: "other1",
          label: "Additional Features",
          value: "",
          placeholder: "Describe additional features",
        },
        {
          id: "other2",
          label: "Special Notes",
          value: "",
          placeholder: "Any special notes",
        },
        {
          id: "other3",
          label: "Follow-up Required",
          value: "",
          placeholder: "Yes/No and details",
        },
      ];
    default:
      return [
        {
          id: "default1",
          label: "General Notes",
          value: "",
          placeholder: "Enter notes here",
        },
      ];
  }
}

export default CategoryInspection;
