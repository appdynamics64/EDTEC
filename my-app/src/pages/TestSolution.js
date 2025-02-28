import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../styles/foundation/colors';
import { BackButton } from '../components/BackButton';

const TestSolution = ({ navigation, route }) => {
  // Assuming we receive test data through route params
  const { testData } = route.params || {};

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Test solutions</Text>
      </View>

      <ScrollView style={styles.content}>
        {testData?.questions?.map((question, index) => (
          <View key={index} style={styles.questionContainer}>
            <Text style={styles.questionText}>
              Q{index + 1}: {question.questionText}
            </Text>

            {/* Options */}
            {question.options.map((option, optIndex) => (
              <Text key={optIndex} style={styles.optionText}>
                Option {String.fromCharCode(65 + optIndex)}: {option}
              </Text>
            ))}

            {/* Answer Section */}
            <View style={styles.answerSection}>
              <View style={styles.answerRow}>
                <Text style={styles.answerLabel}>Correct answer</Text>
                <Text style={styles.correctAnswer}>
                  Option {question.correctAnswer}
                </Text>
              </View>

              <View style={styles.answerRow}>
                <Text style={styles.answerLabel}>Your answer:</Text>
                <View style={styles.userAnswerContainer}>
                  <Text style={styles.userAnswer}>
                    Option {question.userAnswer}
                  </Text>
                  <Text style={[
                    styles.answerStatus,
                    question.correctAnswer === question.userAnswer
                      ? styles.correct
                      : styles.wrong
                  ]}>
                    {question.correctAnswer === question.userAnswer ? 'Correct' : 'Wrong'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Solution */}
            <View style={styles.solutionContainer}>
              <Text style={styles.solutionLabel}>Solution</Text>
              <Text style={styles.solutionText}>{question.solution}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  questionContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  optionText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  answerSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  answerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  answerLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  correctAnswer: {
    fontSize: 14,
    color: colors.text,
  },
  userAnswerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAnswer: {
    fontSize: 14,
    color: colors.text,
    marginRight: 8,
  },
  answerStatus: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  correct: {
    backgroundColor: colors.success + '20',
    color: colors.success,
  },
  wrong: {
    backgroundColor: colors.error + '20',
    color: colors.error,
  },
  solutionContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  solutionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  solutionText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

export default TestSolution; 