const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// gradeQuiz: callable function that validates quiz answers server-side, awards points and writes progress
exports.gradeQuiz = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  const { quizId, quiz, answers } = data; // Accept either quizId or full quiz object for flexibility
  try {
    const questions = quiz ? quiz.questions : (await admin.firestore().collection('quizzes').doc(quizId).get()).data().questions;
    let earned = 0, total = 0;
    questions.forEach(q => { total += (q.xp || 10); });
    for (const a of answers) {
      const q = questions.find(x => x.id === a.questionId);
      if (q && q.answerIndex === a.selectedIndex) earned += (q.xp || 10);
    }

    // Update user points atomically
    const userRef = admin.firestore().collection('users').doc(context.auth.uid);
    await userRef.update({ points: admin.firestore.FieldValue.increment(earned), lastSeenAt: Date.now() });

    // persist progress
    const lessonId = quiz?.lessonId || data.lessonId || 'unknown_lesson';
    const progressRef = admin.firestore().collection('progress').doc(`${context.auth.uid}_${lessonId}`);
    await progressRef.set({
      userId: context.auth.uid,
      lessonId,
      completed: true,
      score: Math.round((earned / total) * 100),
      xpEarned: earned,
      attempts: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.Timestamp.now()
    }, { merge: true });

    // Optionally: trigger badge awarding via pubsub or direct call (not implemented here)

    return { earned, total };
  } catch (e) {
    console.error('gradeQuiz error', e);
    throw new functions.https.HttpsError('internal', 'Failed to grade quiz');
  }
});

// generatePersonalizedContent: callable function that calls an LLM (Gemini) to produce remediation content
// NOTE: This is a template. Insert your Gemini / Google Cloud client call and ensure keys are stored in environment variables.
exports.generatePersonalizedContent = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  const { lessonId, weakPoints } = data;
  try {
    // Build prompt for LLM using the user's weak points and lesson context
    // Call your LLM here (Gemini API or other) with a well-formed prompt. Example pseudo-call:
    // const lesson = await admin.firestore().collection('lessons').doc(lessonId).get();
    // const prompt = buildPrompt(lesson.data(), weakPoints);
    // const aiResponse = await callGemini(prompt);
    // Validate aiResponse and store to recommended_content collection

    // For now, return a mock response (replace with LLM call in production)
    const mock = {
      created: true,
      payload: {
        type: 'microlesson',
        title: 'Quick practice: Emergency fund',
        content: [ /* ... */ ]
      }
    };

    await admin.firestore().collection('recommended_content').doc(context.auth.uid).set({ lastGeneratedAt: admin.firestore.Timestamp.now() }, { merge: true });
    return mock;
  } catch (e) {
    console.error('generatePersonalizedContent error', e);
    throw new functions.https.HttpsError('internal', 'Failed to generate content');
  }
});