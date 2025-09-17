import React, { useEffect } from 'react';
import Navbar from './components/Navbar';
import Welcome from './components/Welcome';
import Skills from './components/Skills';
import Projects from './components/Projects';
import Experience from './components/Experience';
import Contact from './components/Contact';
import AITutor from './components/ChatBot';
import Footer from './components/Footer';

function App() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-gray-50 font-sans">
      <Navbar />
      <Welcome />
      <Skills />
      <Projects />
      <Experience />
      <Contact />
      <AITutor />
      <Footer />
    </div>
  );
}

export default App;
