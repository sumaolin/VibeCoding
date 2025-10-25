// DOM Elements
const skillBars = document.querySelectorAll('.skill-bar');
const aboutCards = document.querySelectorAll('.about-card');
const skillItems = document.querySelectorAll('.skill-item');
const contactItems = document.querySelectorAll('.contact-item');

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.3,
    rootMargin: '0px 0px -50px 0px'
};

// Animate skill bars when in view
const skillObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const skillBar = entry.target.querySelector('.skill-bar');
            const level = skillBar.dataset.level;
            
            setTimeout(() => {
                skillBar.style.width = level + '%';
            }, 300);
            
            skillObserver.unobserve(entry.target);
        }
    });
}, observerOptions);

// Animate cards when in view
const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Initialize observers
skillItems.forEach(item => {
    skillObserver.observe(item);
});

aboutCards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(50px)';
    card.style.transition = `all 0.6s ease ${index * 0.2}s`;
    cardObserver.observe(card);
});

contactItems.forEach((item, index) => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(50px)';
    item.style.transition = `all 0.6s ease ${index * 0.2}s`;
    cardObserver.observe(item);
});

// Smooth scroll function
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        const headerHeight = document.querySelector('.header').offsetHeight;
        const sectionTop = section.offsetTop - headerHeight - 20;
        
        window.scrollTo({
            top: sectionTop,
            behavior: 'smooth'
        });
    }
}

// Header scroll effect
let lastScrollY = window.scrollY;
const header = document.querySelector('.header');

window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;
    
    if (currentScrollY > 100) {
        header.style.background = 'rgba(10, 10, 10, 0.95)';
        header.style.backdropFilter = 'blur(15px)';
    } else {
        header.style.background = 'rgba(10, 10, 10, 0.9)';
        header.style.backdropFilter = 'blur(10px)';
    }
    
    // Hide/show header on scroll
    if (currentScrollY > lastScrollY && currentScrollY > 200) {
        header.style.transform = 'translateY(-100%)';
    } else {
        header.style.transform = 'translateY(0)';
    }
    
    lastScrollY = currentScrollY;
});

// Parallax effect for hero section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const heroContent = document.querySelector('.hero-content');
    const heroAvatar = document.querySelector('.hero-avatar');
    
    if (heroContent && heroAvatar) {
        heroContent.style.transform = `translateY(${scrolled * 0.3}px)`;
        heroAvatar.style.transform = `translateY(${scrolled * 0.2}px)`;
    }
});

// Interactive particle effects
function createParticle(x, y) {
    const particle = document.createElement('div');
    particle.className = 'interactive-particle';
    particle.style.cssText = `
        position: fixed;
        width: 6px;
        height: 6px;
        background: #00d4ff;
        border-radius: 50%;
        pointer-events: none;
        z-index: 1000;
        left: ${x}px;
        top: ${y}px;
        box-shadow: 0 0 10px #00d4ff;
        animation: particleFade 1s ease-out forwards;
    `;
    
    document.body.appendChild(particle);
    
    setTimeout(() => {
        particle.remove();
    }, 1000);
}

// Add particle fade animation
const style = document.createElement('style');
style.textContent = `
    @keyframes particleFade {
        0% {
            transform: scale(0) translateY(0);
            opacity: 1;
        }
        100% {
            transform: scale(1) translateY(-50px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Mouse move particle effect
let particleTimeout;
document.addEventListener('mousemove', (e) => {
    clearTimeout(particleTimeout);
    particleTimeout = setTimeout(() => {
        if (Math.random() > 0.9) {
            createParticle(e.clientX, e.clientY);
        }
    }, 50);
});

// Typing effect for hero title
function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.innerHTML = '';
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// Initialize typing effect
window.addEventListener('load', () => {
    const titleMain = document.querySelector('.title-main');
    if (titleMain) {
        const originalText = titleMain.textContent;
        titleMain.style.opacity = '1';
        setTimeout(() => {
            typeWriter(titleMain, originalText, 150);
        }, 1000);
    }
});

// Contact item click effects
contactItems.forEach(item => {
    item.addEventListener('click', () => {
        const contactValue = item.querySelector('.contact-value').textContent;
        
        if (contactValue.includes('@')) {
            // Email
            window.location.href = `mailto:${contactValue}`;
        } else if (contactValue === 'dajiangjunok') {
            // GitHub
            window.open('https://github.com/dajiangjunok', '_blank');
        }
        
        // Add click effect
        item.style.transform = 'scale(0.95)';
        setTimeout(() => {
            item.style.transform = 'translateY(-5px)';
        }, 150);
    });
});

// Add hover effect to buttons
document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'translateY(-3px) scale(1.05)';
    });
    
    btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translateY(0) scale(1)';
    });
});

// Navbar active link highlighting
function updateActiveLink() {
    const sections = document.querySelectorAll('.section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 150;
        const sectionHeight = section.offsetHeight;
        
        if (window.pageYOffset >= sectionTop && 
            window.pageYOffset < sectionTop + sectionHeight) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
}

window.addEventListener('scroll', updateActiveLink);

// Add active class styles
const activeStyle = document.createElement('style');
activeStyle.textContent = `
    .nav-link.active {
        color: #00d4ff !important;
        text-shadow: 0 0 10px #00d4ff;
    }
    
    .nav-link.active::after {
        width: 100% !important;
    }
`;
document.head.appendChild(activeStyle);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Add loading animation
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    }, 100);
    
    // Initialize particles
    setTimeout(() => {
        for (let i = 0; i < 3; i++) {
            createParticle(
                Math.random() * window.innerWidth,
                Math.random() * window.innerHeight
            );
        }
    }, 1000);
});