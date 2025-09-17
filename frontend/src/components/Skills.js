import React, { useEffect } from 'react';

const Skills = () => {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, {
      threshold: 0.1
    });

    document.querySelectorAll('.slide-in').forEach(el => {
      observer.observe(el);
    });

    // Additional interactivity for skills cards
    document.querySelectorAll('.skill-card').forEach(card => {
      card.addEventListener('mouseenter', function() {
        const icon = this.querySelector('i');
        icon.classList.add('animate-bounce');
      });

      card.addEventListener('mouseleave', function() {
        const icon = this.querySelector('i');
        icon.classList.remove('animate-bounce');
      });
    });
  }, []);

  return (
    <section id="skills" className="py-20">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-16">Technical Expertise</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Frontend Card */}
          <div className="skill-card bg-white rounded-xl p-6 shadow-md transition-all duration-300 hover:border-l-4 hover:border-blue-500">
            <div className="text-blue-500 mb-4">
              <i className="fas fa-laptop-code text-4xl"></i>
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-800">Frontend Development</h3>
            <p className="text-gray-600 mb-4">Crafting responsive, accessible user interfaces with React, HTML, and CSS.</p>
            <div className="flex flex-wrap gap-2">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">React</span>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">HTML</span>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">CSS</span>
            </div>
          </div>

          {/* Backend Card */}
          <div className="skill-card bg-white rounded-xl p-6 shadow-md transition-all duration-300 hover:border-l-4 hover:border-green-500">
            <div className="text-green-500 mb-4">
              <i className="fas fa-server text-4xl"></i>
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-800">Backend Development</h3>
            <p className="text-gray-600 mb-4">Building scalable, secure server-side applications with Flask and Python.</p>
            <div className="flex flex-wrap gap-2">
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">Flask</span>
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">Python</span>
            </div>
          </div>

          {/* DevOps Card */}
          <div className="skill-card bg-white rounded-xl p-6 shadow-md transition-all duration-300 hover:border-l-4 hover:border-purple-500">
            <div className="text-purple-500 mb-4">
              <i className="fas fa-cloud text-4xl"></i>
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-800">DevOps & Cloud</h3>
            <p className="text-gray-600 mb-4">Implementing CI/CD pipelines and cloud infrastructure for seamless deployments.</p>
            <div className="flex flex-wrap gap-2">
              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">Docker</span>
              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">AWS</span>
              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">GCP</span>
              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">Terraform</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Skills;
