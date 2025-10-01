import { getFunctions, httpsCallable } from 'firebase/functions';

// Helper to call a callable function by name. If Firebase Functions aren't configured, we return a simulated response.
export async function callGradeQuiz(payload: any) {
  try {
    const functions = getFunctions();
    const grade = httpsCallable(functions as any, 'gradeQuiz');
    const res = await grade(payload);
    return res.data;
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.log('gradeQuiz callable failed, simulating', e.message);
    } else {
      console.log('gradeQuiz callable failed, simulating', e);
    }
    // Simulate grading locally (dangerous: for demo only)
    let earned = 0;
    let total = 0;
    const quiz = payload.quiz; // expecting quiz content
    quiz.questions.forEach((q: any) => {
      total += q.xp || 10;
    });
    payload.answers.forEach((a: any) => {
      const q = quiz.questions.find((x: any) => x.id === a.questionId);
      if (q && q.answerIndex === a.selectedIndex) earned += q.xp || 10;
    });
    return { earned, total };
  }
}

export async function callGeneratePersonalizedContent(payload: any) {
  try {
    const functions = getFunctions();
    const gen = httpsCallable(functions as any, 'generatePersonalizedContent');
    const res = await gen(payload);
    return res.data;
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.log('generatePersonalizedContent failed, returning mock', e.message);
    } else {
      console.log('generatePersonalizedContent failed, returning mock', e);
    }
    return { created: false };
  }
}