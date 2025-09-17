import React, { useEffect, useRef, useState } from 'react';

const Welcome = () => {
  const exploreBtnRef = useRef(null);
  const imageRef = useRef(null);
  const [greeting, setGreeting] = useState('Welcome to my Portfolio');

  useEffect(() => {
    const handleExploreClick = () => {
      document.getElementById('skills').scrollIntoView({
        behavior: 'smooth'
      });
    };

    if (exploreBtnRef.current) {
      exploreBtnRef.current.addEventListener('click', handleExploreClick);
    }

    // Dynamic greeting based on time
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning! Welcome to my Portfolio');
    else if (hour < 18) setGreeting('Good Afternoon! Welcome to my Portfolio');
    else setGreeting('Good Evening! Welcome to my Portfolio');

    // Parallax effect
    const handleScroll = () => {
      if (imageRef.current) {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        imageRef.current.style.transform = `translateY(${rate}px)`;
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      if (exploreBtnRef.current) {
        exploreBtnRef.current.removeEventListener('click', handleExploreClick);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <section id="welcome" className="min-h-screen flex items-center justify-center relative">
      <div className="container mx-auto px-6 py-12 text-center glassmorphism">
        <img
          ref={imageRef}
          src="/images/WhatsApp_Image_2025-08-15_at_11.06.05_f880c9dd.jpg"
          alt="Profile photo"
          className="w-48 h-48 mx-auto rounded-full object-cover border-4 border-white shadow-lg floating parallax mb-8"
        />
        <h1 className="text-5xl font-bold text-gray-800 mb-4 typing">{greeting}</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8 slide-in">
          Hi, I'm <span className="font-bold text-blue-600">Kenneth Thuo</span>, a passionate Junior Engineer crafting digital experiences that matter.
        </p>
        <div className="slide-in">
          <button
            ref={exploreBtnRef}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg glow-hover"
          >
            Explore My Skills <i className="fas fa-arrow-down ml-2"></i>
          </button>
        </div>
      </div>
    </section>
  );
};

export default Welcome;
