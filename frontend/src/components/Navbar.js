import React, { useState } from 'react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white shadow-lg z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="text-2xl font-bold text-gray-800">Kenneth J.</div>
          <div className="hidden md:flex space-x-6">
            <button onClick={() => scrollToSection('welcome')} className="text-gray-600 hover:text-blue-600 transition duration-300">Home</button>
            <button onClick={() => scrollToSection('skills')} className="text-gray-600 hover:text-blue-600 transition duration-300">Skills</button>
            <button onClick={() => scrollToSection('projects')} className="text-gray-600 hover:text-blue-600 transition duration-300">Projects</button>
            <button onClick={() => scrollToSection('experience')} className="text-gray-600 hover:text-blue-600 transition duration-300">Experience</button>
            <button onClick={() => scrollToSection('contact')} className="text-gray-600 hover:text-blue-600 transition duration-300">Contact</button>
            <button onClick={() => scrollToSection('ai-tutor')} className="text-gray-600 hover:text-blue-600 transition duration-300">AI Tutor</button>
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-gray-600 hover:text-blue-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>
        {isOpen && (
          <div className="md:hidden mt-4 pb-4">
            <button onClick={() => scrollToSection('welcome')} className="block w-full text-left py-2 text-gray-600 hover:text-blue-600 transition duration-300">Home</button>
            <button onClick={() => scrollToSection('skills')} className="block w-full text-left py-2 text-gray-600 hover:text-blue-600 transition duration-300">Skills</button>
            <button onClick={() => scrollToSection('projects')} className="block w-full text-left py-2 text-gray-600 hover:text-blue-600 transition duration-300">Projects</button>
            <button onClick={() => scrollToSection('experience')} className="block w-full text-left py-2 text-gray-600 hover:text-blue-600 transition duration-300">Experience</button>
            <button onClick={() => scrollToSection('contact')} className="block w-full text-left py-2 text-gray-600 hover:text-blue-600 transition duration-300">Contact</button>
            <button onClick={() => scrollToSection('ai-tutor')} className="block w-full text-left py-2 text-gray-600 hover:text-blue-600 transition duration-300">AI Tutor</button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
