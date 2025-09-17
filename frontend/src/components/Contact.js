import React from 'react';

const Contact = () => {

  return (
    <section id="contact" className="py-20 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-16">Get in Touch</h2>

        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-12 text-center">
          <p className="text-gray-600 mb-8">
            I'm currently available for full-time opportunities and freelance projects. Reach out and let's discuss how I can contribute to your team.
          </p>

          <div className="space-y-6">
            <div className="flex items-center justify-center">
              <i className="fas fa-envelope text-blue-600 mr-4 text-xl"></i>
              <span className="text-gray-800">kennjorothuo@gmail.com</span>
            </div>
            <div className="flex items-center justify-center">
              <i className="fas fa-phone text-blue-600 mr-4 text-xl"></i>
              <span className="text-gray-800">+254 745 050 583</span>
            </div>
            <div className="flex items-center justify-center">
              <i className="fas fa-map-marker-alt text-blue-600 mr-4 text-xl"></i>
              <span className="text-gray-800">Nairobi, Kenya</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
