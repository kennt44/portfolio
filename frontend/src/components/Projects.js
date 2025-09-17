import React, { useEffect, useState } from 'react';

const Projects = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const projects = [
    {
      id: 1,
      title: 'Moringa Daily Dev',
      description: 'Daily development challenges and projects from Moringa School.',
      image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
      link: 'https://moringa-daily-dev-nr3m.onrender.com'
    },
    {
      id: 2,
      title: 'Music App',
      description: 'A music streaming app with playlists and user controls.',
      image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
      link: 'https://music-app-rose-three.vercel.app/'
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % projects.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + projects.length) % projects.length);
  };

  useEffect(() => {
    const slider = document.getElementById('projectSlider');
    if (slider) {
      const slideWidth = document.querySelector('.project-card')?.offsetWidth || 0;
      slider.style.transform = `translateX(-${currentSlide * (slideWidth + 32)}px)`;
    }
  }, [currentSlide]);

  return (
    <section id="projects" className="py-20">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-16">Featured Projects</h2>

        <div className="relative">
          <div id="projectSlider" className="flex gap-8 overflow-hidden">
            {projects.map((project) => (
              <div key={project.id} className="project-card bg-white rounded-xl overflow-hidden shadow-md relative flex-shrink-0 w-full md:w-1/2">
                <img src={project.image} alt={project.title} className="w-full h-64 object-cover" />
                <div className="project-overlay absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center opacity-0 transition-opacity duration-300">
                  <div className="text-white p-6 text-center">
                    <h3 className="text-xl font-bold mb-2">{project.title}</h3>
                    <p className="mb-4">{project.description}</p>
                    <button
                      className="view-btn bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-sm"
                      onClick={() => window.open(project.link, '_blank')}
                      title="View Project"
                    >
                      View Project
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-2">{project.title}</h3>
                  <p className="text-gray-600">Web Development</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white p-3 rounded-full shadow-md -ml-4 z-10"
          >
            <i className="fas fa-chevron-left text-blue-600"></i>
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white p-3 rounded-full shadow-md -mr-4 z-10"
          >
            <i className="fas fa-chevron-right text-blue-600"></i>
          </button>
        </div>
      </div>
    </section>
  );
};

export default Projects;
