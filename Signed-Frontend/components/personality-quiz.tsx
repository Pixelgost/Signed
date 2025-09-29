import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { CheckIcon } from './icons';
import { colors, spacing, fontSizes, fontWeights, borderRadius, shadows } from '../styles/colors';

interface PersonalityQuizProps {
  onComplete: () => void;
}

const questions = [
  {
    id: 1,
    question: "What type of work environment do you thrive in?",
    options: [
      "Fast-paced startup",
      "Established corporation",
      "Remote-first company",
      "Collaborative team setting"
    ]
  },
  {
    id: 2,
    question: "What motivates you most in your career?",
    options: [
      "Learning new skills",
      "Making an impact",
      "Work-life balance",
      "Financial growth"
    ]
  },
  {
    id: 3,
    question: "How do you prefer to receive feedback?",
    options: [
      "Regular one-on-ones",
      "Team retrospectives",
      "Written feedback",
      "Peer reviews"
    ]
  },
  {
    id: 4,
    question: "What's your ideal team size?",
    options: [
      "Small team (2-5 people)",
      "Medium team (6-15 people)",
      "Large team (15+ people)",
      "I prefer working independently"
    ]
  },
  {
    id: 5,
    question: "Which best describes your communication style?",
    options: [
      "Direct and concise",
      "Collaborative and inclusive",
      "Analytical and detailed",
      "Creative and expressive"
    ]
  }
];

export const PersonalityQuiz = ({ onComplete }: PersonalityQuizProps) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});

  const handleAnswerSelect = (questionId: number, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Quiz complete
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const currentQ = questions[currentQuestion];
  const selectedAnswer = answers[currentQ.id];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {currentQuestion + 1} of {questions.length}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.question}>{currentQ.question}</Text>

        <View style={styles.optionsContainer}>
          {currentQ.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                selectedAnswer === option && styles.optionButtonSelected
              ]}
              onPress={() => handleAnswerSelect(currentQ.id, option)}
            >
              <Text style={[
                styles.optionText,
                selectedAnswer === option && styles.optionTextSelected
              ]}>
                {option}
              </Text>
              {selectedAnswer === option && (
                <CheckIcon size={20} color={colors.primaryForeground} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.navigation}>
        {currentQuestion > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={handlePrevious}>
            <Text style={styles.backButtonText}>Previous</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.nextButton,
            !selectedAnswer && styles.nextButtonDisabled
          ]}
          onPress={handleNext}
          disabled={!selectedAnswer}
        >
          <Text style={styles.nextButtonText}>
            {currentQuestion === questions.length - 1 ? 'Complete' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progressContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.muted,
    borderRadius: 2,
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: fontSizes.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  question: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.semibold,
    color: colors.foreground,
    marginBottom: spacing.xl,
    lineHeight: 28,
  },
  optionsContainer: {
    gap: spacing.sm,
  },
  optionButton: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.sm,
  },
  optionButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  optionText: {
    fontSize: fontSizes.base,
    color: colors.foreground,
    fontWeight: fontWeights.medium,
    flex: 1,
  },
  optionTextSelected: {
    color: colors.primaryForeground,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  backButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.muted,
    borderRadius: borderRadius.lg,
  },
  backButtonText: {
    fontSize: fontSizes.base,
    color: colors.foreground,
    fontWeight: fontWeights.medium,
  },
  nextButton: {
    flex: 2,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  nextButtonDisabled: {
    backgroundColor: colors.muted,
  },
  nextButtonText: {
    fontSize: fontSizes.base,
    color: colors.primaryForeground,
    fontWeight: fontWeights.semibold,
  },
});