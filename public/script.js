// Contact form handling
document.getElementById('contactForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const form = this;
  const button = form.querySelector('button[type="submit"]');
  const originalText = button.textContent;

  // Remove any previous feedback message
  const oldMsg = form.querySelector('.form-feedback');
  if (oldMsg) oldMsg.remove();

  // Get form data
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);

  // Show loading state
  button.disabled = true;
  button.textContent = 'Sending...';

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    const msg = document.createElement('p');
    msg.className = 'form-feedback';

    if (response.ok && result.success) {
      msg.style.color = '#22c55e';
      msg.textContent = "Thanks for reaching out! We'll get back to you soon.";
      form.reset();
    } else {
      msg.style.color = '#ef4444';
      msg.textContent = result.error || 'Something went wrong. Please try again.';
    }

    button.insertAdjacentElement('afterend', msg);
  } catch {
    const msg = document.createElement('p');
    msg.className = 'form-feedback';
    msg.style.color = '#ef4444';
    msg.textContent = 'Network error. Please check your connection and try again.';
    button.insertAdjacentElement('afterend', msg);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});
