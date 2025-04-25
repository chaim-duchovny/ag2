document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registration-form');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const agentFileInput = document.getElementById('agentFile');
    const usernameError = document.getElementById('username-error');
    const emailError = document.getElementById('email-error');
    const passwordError = document.getElementById('password-error');
    const resultDiv = document.getElementById('result');
  
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
  
      // Clear previous errors
      usernameError.textContent = '';
      emailError.textContent = '';
      passwordError.textContent = '';
      resultDiv.textContent = '';
  
      // Password confirmation check
      if (passwordInput.value !== confirmPasswordInput.value) {
        passwordError.textContent = 'Passwords do not match.';
        return;
      }
  
      // Prepare form data
      const formData = new FormData(form);
  
      try {
        const response = await fetch('/register', {
          method: 'POST',
          body: formData
        });
  
        const data = await response.json();
        if (response.ok) {
          resultDiv.style.color = 'green';
          resultDiv.textContent = data.message;
          form.reset();
        } else {
          resultDiv.style.color = 'red';
          resultDiv.textContent = data.message || 'Registration failed.';
        }
      } catch (error) {
        resultDiv.style.color = 'red';
        resultDiv.textContent = 'An error occurred during registration.';
      }
    });
  });
  