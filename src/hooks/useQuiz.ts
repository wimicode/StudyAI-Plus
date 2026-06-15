'use client';
import { useState, useCallback } from 'react';
import type { QuizQuestion } from '@/types';

export function useQuiz(questions: QuizQuestion[]) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const currentQuestion = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const answer = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const next = useCallback(() => {
    if (!isLast) setCurrentIndex((i) => i + 1);
  }, [isLast]);

  const previous = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }, [currentIndex]);

  const submit = useCallback(() => {
    setSubmitted(true);
  }, []);

  const reset = useCallback(() => {
    setCurrentIndex(0);
    setAnswers({});
    setSubmitted(false);
  }, []);

  return { currentQuestion, currentIndex, answers, submitted, progress, isLast, answer, next, previous, submit, reset };
}
