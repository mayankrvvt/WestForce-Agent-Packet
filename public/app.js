const form = document.getElementById('lead-form');
const errorBox = document.getElementById('form-error');
const submitButton = document.getElementById('submit-button');
const successState = document.getElementById('success-state');
const sendAnother = document.getElementById('send-another');
document.getElementById('year').textContent = new Date().getFullYear();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.textContent = '';
  if (!form.reportValidity()) return;
  const payload = Object.fromEntries(new FormData(form).entries());
  payload.consent = document.getElementById('consent').checked;
  submitButton.disabled = true;
  submitButton.innerHTML = 'Submitting… <span aria-hidden="true">↗</span>';
  try {
    const response = await fetch('/api/leads', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'We could not submit your request. Please try again.');
    form.hidden = true;
    document.querySelector('.form-heading').hidden = true;
    successState.hidden = false;
  } catch (error) {
    errorBox.textContent = error.message || 'Something went wrong. Please try again.';
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'Submit request <span aria-hidden="true">→</span>';
  }
});

sendAnother.addEventListener('click', () => {
  form.reset(); form.hidden = false; successState.hidden = true;
  document.querySelector('.form-heading').hidden = false;
  errorBox.textContent = '';
  document.getElementById('name').focus();
});
