document.addEventListener('DOMContentLoaded', function() {
    // Scroll to skills section when button is clicked
    document.getElementById('exploreBtn').addEventListener('click', function() {
        document.getElementById('skills').scrollIntoView({
            behavior: 'smooth'
        });
    });
    
    // Animate elements as they come into view
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
    
    // Project slider functionality
    const slider = document.getElementById('projectSlider');
    const prevBtn = document.getElementById('prevProject');
    const nextBtn = document.getElementById('nextProject');
    let currentSlide = 0;
    
    function updateSlider() {
        const slideWidth = document.querySelector('.project-card').offsetWidth;
        slider.style.transform = `translateX(-${currentSlide * (slideWidth + 32)}px)`;
    }
    
    nextBtn.addEventListener('click', () => {
        if (currentSlide < 2) {
            currentSlide++;
            updateSlider();
        }
    });
    
    prevBtn.addEventListener('click', () => {
        if (currentSlide > 0) {
            currentSlide--;
            updateSlider();
        }
    });
    
    document.getElementById('contactForm').addEventListener('submit', function(e) {
        e.preventDefault();

        const form = e.target;
        const data = {
            name: form.name.value,
            email: form.email.value,
            message: form.message.value
        };

        // Disable submit button to prevent multiple submissions
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';

        fetch('/api/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            alert(data.message || 'Message sent successfully! I will get back to you soon.');
            form.reset();
        })
        .catch(error => {
            alert('There was a problem sending your message. Please try again later.');
            console.error('Error:', error);
        })
        .finally(() => {
            submitButton.disabled = false;
            submitButton.textContent = 'Send Message';
        });
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

    // Add event listeners to "View Details" buttons with project-specific details
    const projectDetails = [
        "ShopSphere: Full-stack e-commerce platform with payment integration and admin dashboard. Completed code challenges and projects at Moringa School.",
        "ConnectPlus: Real-time social media app with authentication and media sharing. Completed code challenges and projects at Moringa School.",
        "TaskFlow: Collaborative task management app with real-time updates. Completed code challenges and projects at Moringa School."
    ];

    document.querySelectorAll('.view-btn').forEach((button, index) => {
        button.addEventListener('click', () => {
            alert(projectDetails[index]);
        });
    });
});

