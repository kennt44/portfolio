import React, { useEffect, useRef } from 'react';

const Welcome = () => {
  const exploreBtnRef = useRef(null);

  useEffect(() => {
    const handleExploreClick = () => {
      document.getElementById('skills').scrollIntoView({
        behavior: 'smooth'
      });
    };

    if (exploreBtnRef.current) {
      exploreBtnRef.current.addEventListener('click', handleExploreClick);
    }

    return () => {
      if (exploreBtnRef.current) {
        exploreBtnRef.current.removeEventListener('click', handleExploreClick);
      }
    };
  }, []);

  return (
    <section id="welcome" className="min-h-screen flex items-center justify-center">
      <div className="container mx-auto px-6 py-12 text-center">
        <img
          src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
          alt="Coding related photo with laptop and code on screen"
          className="w-48 h-48 mx-auto rounded-full object-cover border-4 border-white shadow-lg floating mb-8"
        />
        <h1 className="text-5xl font-bold text-gray-800 mb-4 typing">Welcome to my Portfolio</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8 slide-in">
          Hi, I'm <span className="font-bold text-blue-600">Kenneth Thuo</span>, a passionate Junior Engineer crafting digital experiences that matter.
        </p>
        <div className="slide-in">
          <button
            ref={exploreBtnRef}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            Explore My Skills <i className="fas fa-arrow-down ml-2"></i>
          </button>
        </div>
      </div>
    </section>
  );
};

export default Welcome;
