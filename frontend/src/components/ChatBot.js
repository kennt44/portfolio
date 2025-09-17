import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AITutor = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [practiceCards, setPracticeCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [message, setMessage] = useState('');

  const API_BASE = 'http://localhost:8000';

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
      setSelectedCourse(iso);
      setPracticeCards(response.data);
      setCurrentCardIndex(0);
      setShowAnswer(false);
      setMessage('');
    } catch (error) {
      setMessage('Failed to load practice cards.');
    }
  };

  const reviewCard = async (quality) => {
    if (practiceCards.length === 0) return;
    const cardId = practiceCards[currentCardIndex].id;
    try {
      await axios.post(`${API_BASE}/review/${cardId}`, quality);
      nextCard();
    } catch (error) {
      setMessage('Failed to review card.');
    }
  };

  const nextCard = () => {
    if (currentCardIndex < practiceCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
    } else {
      setMessage('Practice session complete!');
      setPracticeCards([]);
      setSelectedCourse(null);
    }
  };

  const playTTS = (text, lang) => {
    const audio = new Audio(`${API_BASE}/practice/tts?text=${encodeURIComponent(text)}&lang=${lang}`);
    audio.play();
  };

  return (
    <section id="ai-tutor" className="py-20 bg-gradient-to-br from-purple-50 to-indigo-100">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-16">AI Language Tutor</h2>

        {message && <p className="text-center text-red-500 mb-4">{message}</p>}

        {!selectedCourse ? (
          <div className="text-center">
            <h3 className="text-xl mb-4">Select a Language to Practice</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {courses.map(course => (
                <button
                  key={course.iso}
                  onClick={() => selectCourse(course.iso)}
                  className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition duration-300"
                >
                  {course.language} ({course.card_count} cards)
                </button>
              ))}
            </div>
            {courses.length === 0 && <p>No courses available. Seed some languages first.</p>}
          </div>
        ) : (
          practiceCards.length > 0 && (
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
              <div className="text-center mb-6">
                <p className="text-gray-600">Card {currentCardIndex + 1} of {practiceCards.length}</p>
              </div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-4">{practiceCards[currentCardIndex].front}</h3>
                <button
                  onClick={() => playTTS(practiceCards[currentCardIndex].front, 'en')}
                  className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded text-sm"
                >
                  🔊 English
                </button>
              </div>
              {!showAnswer ? (
                <button
                  onClick={() => setShowAnswer(true)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg transition duration-300"
                >
                  Show Answer
                </button>
              ) : (
                <div>
                  <p className="text-xl mb-4">{practiceCards[currentCardIndex].back}</p>
                  <button
                    onClick={() => playTTS(practiceCards[currentCardIndex].back, selectedCourse)}
                    className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded text-sm mb-4"
                  >
                    🔊 Target Language
                  </button>
                  <div className="flex justify-between">
                    <button onClick={() => reviewCard(0)} className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded">Again (0)</button>
                    <button onClick={() => reviewCard(1)} className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded">Hard (1)</button>
                    <button onClick={() => reviewCard(2)} className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded">Good (2)</button>
                    <button onClick={() => reviewCard(3)} className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded">Easy (3)</button>
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
