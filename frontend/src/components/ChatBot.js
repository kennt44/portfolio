import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const AITutor = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [practiceCards, setPracticeCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [message, setMessage] = useState('');
  const [courseStats, setCourseStats] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);

  // New states for speech recognition
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const API_BASE = '';

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await axios.get(`${API_BASE}/courses`);
      setCourses(response.data);
    } catch (error) {
      setMessage('Failed to load courses. Make sure the AI tutor backend is running.');
    }
  };

  const selectCourse = async (iso) => {
    try {
      const response = await axios.get(`${API_BASE}/practice/${iso}`);
      const statsResponse = await axios.get(`${API_BASE}/course/${iso}/stats`);
      setSelectedCourse(iso);
      setPracticeCards(response.data);
      setCourseStats(statsResponse.data);
      setCurrentCardIndex(0);
      setShowAnswer(false);
      setMessage('');
      setEvaluationResult(null);
    } catch (error) {
      setMessage('Failed to load practice cards.');
    }
  };



  const resetCourse = async () => {
    if (!selectedCourse) return;
    try {
      await axios.post(`${API_BASE}/course/${selectedCourse}/reset`);
      setMessage('Course progress reset!');
      selectCourse(selectedCourse); // Refresh the course
    } catch (error) {
      setMessage('Failed to reset course.');
    }
  };

  const reviewCard = async (quality) => {
    if (practiceCards.length === 0) return;
    const cardId = practiceCards[currentCardIndex].id;
    try {
      await axios.post(`${API_BASE}/review/${cardId}`, quality);
      nextCard();
      setEvaluationResult(null);
    } catch (error) {
      setMessage('Failed to review card.');
    }
  };

  const nextCard = () => {
    if (currentCardIndex < practiceCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
      setEvaluationResult(null);
    } else {
      setMessage('Practice session complete!');
      setPracticeCards([]);
      setSelectedCourse(null);
      setEvaluationResult(null);
    }
  };

  const playTTS = (text, lang) => {
    const audio = new Audio(`${API_BASE}/practice/tts?text=${encodeURIComponent(text)}&lang=${lang}`);
    audio.play();
  };

  // Start recording audio
  const startRecording = () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMessage('Your browser does not support audio recording.');
      return;
    }
    setMessage('');
    setEvaluationResult(null);
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        audioChunksRef.current = [];
        mediaRecorderRef.current.ondataavailable = event => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setRecordedAudio(audioBlob);
          evaluatePronunciation(audioBlob);
        };
        mediaRecorderRef.current.start();
        setIsRecording(true);
      })
      .catch(() => {
        setMessage('Microphone access denied or not available.');
      });
  };

  // Stop recording audio
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Send recorded audio to backend for evaluation
  const evaluatePronunciation = async (audioBlob) => {
    if (practiceCards.length === 0) return;
    const expectedText = practiceCards[currentCardIndex].back;
    const formData = new FormData();
    formData.append('expected', expectedText);
    formData.append('file', audioBlob, 'recording.webm');
    try {
      const response = await axios.post(`${API_BASE}/practice/evaluate`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setEvaluationResult(response.data);
    } catch (error) {
      setMessage('Failed to evaluate pronunciation.');
    }
  };

  return (
    <section id="ai-tutor" className="py-20 relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <h2 className="text-4xl font-bold text-center text-gray-800 mb-16 animate-fade-in">AI Language Tutor (Demo)</h2>

        {message && <p className="text-center text-red-500 mb-4 animate-bounce">{message}</p>}

        {!selectedCourse ? (
          <div className="text-center">
            <h3 className="text-2xl mb-8 text-gray-700">Select a Language to Practice</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {courses.map(course => (
                <button
                  key={course.iso}
                  onClick={() => selectCourse(course.iso)}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-4 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300 flex flex-col items-center"
                >
                  <span className="text-2xl mb-2">🌍</span>
                  <span className="font-semibold">{course.language}</span>
                  <span className="text-sm opacity-90">({course.card_count} cards)</span>
                </button>
              ))}
            </div>
            {courses.length === 0 && <p className="text-gray-600">No courses available. Demo languages will be seeded automatically.</p>}
          </div>
        ) : (
          practiceCards.length > 0 && (
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl p-10 animate-slide-up">
              {/* Header with navigation and stats */}
              <div className="flex justify-between items-center mb-6">
                <button
                  onClick={() => {
                    setSelectedCourse(null);
                    setPracticeCards([]);
                    setMessage('');
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg shadow-md transform hover:scale-105 transition-all duration-300"
                >
                  ← Back to Languages
                </button>
                <button
                  onClick={resetCourse}
                  className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg shadow-md transform hover:scale-105 transition-all duration-300"
                >
                  🔄 Reset Progress
                </button>
              </div>

              {/* Course Stats */}
              {courseStats && (
                <div className="bg-blue-50 p-4 rounded-lg mb-6">
                  <h4 className="font-semibold text-blue-800 mb-2">Course Progress</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{courseStats.total_cards}</p>
                      <p className="text-sm text-gray-600">Total Cards</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{courseStats.mastered}</p>
                      <p className="text-sm text-gray-600">Mastered</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-orange-600">{courseStats.due_today}</p>
                      <p className="text-sm text-gray-600">Due Today</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center mb-8">
                <p className="text-gray-600 text-lg">Card {currentCardIndex + 1} of {practiceCards.length}</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                  <div className="bg-purple-600 h-2 rounded-full transition-all duration-300" style={{width: `${((currentCardIndex + 1) / practiceCards.length) * 100}%`}}></div>
                </div>
              </div>
              <div className="mb-8">
                <h3 className="text-3xl font-bold mb-6 text-center text-gray-800">{practiceCards[currentCardIndex].front}</h3>
                <div className="text-center flex justify-center space-x-4 mb-4">
                  <button
                    onClick={() => playTTS(practiceCards[currentCardIndex].front, 'en')}
                    className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg shadow-md transform hover:scale-110 transition-all duration-300"
                  >
                    🔊 English
                  </button>
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`py-2 px-4 rounded-lg shadow-md transform transition-all duration-300 font-semibold ${
                      isRecording ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                  >
                    {isRecording ? '⏹ Stop Recording' : '🎤 Record'}
                  </button>
                  <button
                    onClick={() => {
                      setShowHint(!showHint);
                      if (!showHint) setHintUsed(true);
                    }}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-lg shadow-md transform hover:scale-110 transition-all duration-300"
                  >
                    💡 Hint
                  </button>
                </div>

                {/* Hint Display */}
                {showHint && (
                  <div className="text-center mb-4 animate-fade-in">
                    <p className="text-lg text-gray-600">First letter: <span className="font-bold text-purple-600">{practiceCards[currentCardIndex].back.charAt(0)}</span></p>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="text-center flex justify-center space-x-4">
                  <button
                    onClick={() => {
                      if (currentCardIndex > 0) {
                        setCurrentCardIndex(currentCardIndex - 1);
                        setShowAnswer(false);
                        setShowHint(false);
                        setHintUsed(false);
                        setEvaluationResult(null);
                      }
                    }}
                    disabled={currentCardIndex === 0}
                    className={`py-2 px-4 rounded-lg shadow-md transform transition-all duration-300 font-semibold ${
                      currentCardIndex === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-indigo-500 hover:bg-indigo-600 text-white hover:scale-105'
                    }`}
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={() => {
                      if (currentCardIndex < practiceCards.length - 1) {
                        setCurrentCardIndex(currentCardIndex + 1);
                        setShowAnswer(false);
                        setShowHint(false);
                        setHintUsed(false);
                        setEvaluationResult(null);
                      }
                    }}
                    disabled={currentCardIndex === practiceCards.length - 1}
                    className={`py-2 px-4 rounded-lg shadow-md transform transition-all duration-300 font-semibold ${
                      currentCardIndex === practiceCards.length - 1
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-indigo-500 hover:bg-indigo-600 text-white hover:scale-105'
                    }`}
                  >
                    Next →
                  </button>
                </div>
              </div>
              {!showAnswer ? (
                <button
                  onClick={() => setShowAnswer(true)}
                  className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white py-4 px-8 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300 text-xl font-semibold"
                >
                  Show Answer ✨
                </button>
              ) : (
                <div className="animate-fade-in">
                  <p className="text-2xl mb-6 text-center text-gray-700 font-medium">{practiceCards[currentCardIndex].back}</p>
                  <div className="text-center mb-6 flex justify-center space-x-4">
                    <button
                      onClick={() => playTTS(practiceCards[currentCardIndex].back, selectedCourse)}
                      className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg shadow-md transform hover:scale-110 transition-all duration-300"
                    >
                      🔊 Target Language
                    </button>
                    {evaluationResult && (
                      <div className={`p-6 rounded-lg shadow-md text-left max-w-lg mx-auto border-l-4 ${
                        evaluationResult.similarity >= 80 ? 'bg-green-50 border-green-500' :
                        evaluationResult.similarity >= 60 ? 'bg-yellow-50 border-yellow-500' :
                        'bg-red-50 border-red-500'
                      }`}>
                        <h4 className="font-bold text-lg mb-3 flex items-center">
                          <span className="mr-2">🎤</span>
                          Pronunciation Feedback
                        </h4>

                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">Similarity Score:</span>
                            <span className={`font-bold text-lg ${
                              evaluationResult.similarity >= 80 ? 'text-green-600' :
                              evaluationResult.similarity >= 60 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {evaluationResult.similarity}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all duration-500 ${
                                evaluationResult.similarity >= 80 ? 'bg-green-500' :
                                evaluationResult.similarity >= 60 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{width: `${evaluationResult.similarity}%`}}
                            ></div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p><strong>Grade:</strong> <span className="text-purple-600 font-semibold">{evaluationResult.grade}</span></p>
                          <p><strong>Feedback:</strong> {evaluationResult.feedback}</p>
                          <p><strong>You said:</strong> <span className="italic">"{evaluationResult.transcript}"</span></p>
                        </div>

                        {evaluationResult.similarity >= 80 && (
                          <div className="mt-4 text-center">
                            <span className="text-green-600 font-semibold">🎉 Excellent pronunciation!</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button onClick={() => reviewCard(0)} className="bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg shadow-md transform hover:scale-105 transition-all duration-300 font-semibold">Again (0)</button>
                    <button onClick={() => reviewCard(1)} className="bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-lg shadow-md transform hover:scale-105 transition-all duration-300 font-semibold">Hard (1)</button>
                    <button onClick={() => reviewCard(2)} className="bg-yellow-500 hover:bg-yellow-600 text-white py-3 px-4 rounded-lg shadow-md transform hover:scale-105 transition-all duration-300 font-semibold">Good (2)</button>
                    <button onClick={() => reviewCard(3)} className="bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg shadow-md transform hover:scale-105 transition-all duration-300 font-semibold">Easy (3)</button>
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </section>
  );
};

export default AITutor;
