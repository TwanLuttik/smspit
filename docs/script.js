document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab');
  const codeBlocks = document.querySelectorAll('.code-block');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const lang = tab.getAttribute('data-lang');

      tabs.forEach(t => t.classList.remove('active'));
      codeBlocks.forEach(cb => cb.classList.remove('active'));

      tab.classList.add('active');
      document.querySelector(`.code-block[data-lang="${lang}"]`).classList.add('active');
    });
  });
});
