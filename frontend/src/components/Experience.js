import React from 'react';

const Experience = () => {
  return (
    <section id="experience" className="py-20">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-16">Professional Journey</h2>

        <div className="relative">
          {/* Timeline Line */}
          <div className="hidden md:block absolute left-1/2 w-1 h-full bg-gradient-to-b from-blue-400 to-indigo-600 transform -translate-x-1/2"></div>

          {/* Timeline Items */}
          <div className="space-y-12">
            {/* Item 3 */}
            <div className="timeline-item relative">
              <div className="md:flex">
                <div className="md:w-1/2 md:pr-12 md:text-right py-4 md:py-0">
                  <h3 className="text-xl font-bold text-gray-800">Full-Stack Developer</h3>
                  <p className="text-gray-600">Moringa School | 2024 - 2025</p>
                </div>
                <div className="hidden md:block md:w-1/2"></div>
              </div>
              <div className="md:flex md:items-center">
                <div className="hidden md:block md:w-1/2 md:pr-12"></div>
                <div className="md:w-1/2 md:pl-12 py-4">
                  <p className="text-gray-700">
                    Built responsive user interfaces for 15+ client projects, improving bounce rates by 25% through UX/UI optimizations and performance enhancements.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Experience;
