const editor = document.getElementById('editor');
const wordCount = document.getElementById('wordCount');
const charCount = document.getElementById('charCount');
const fontFamilySelect = document.getElementById('fontFamilySelect');
const fontSizeSelect = document.getElementById('fontSizeSelect');

function exec(cmd, value = null) {
  document.execCommand(cmd, false, value);
  editor.focus();
}

fontFamilySelect.addEventListener('change', () => {
  editor.style.fontFamily = fontFamilySelect.value;
});

fontSizeSelect.addEventListener('change', () => {
  const size = fontSizeSelect.value + 'pt';
  editor.style.fontSize = size;
});

function updateCount() {
  const text = editor.innerText.trim();
  wordCount.innerText = `Palavras: ${text.split(/\s+/).filter(Boolean).length}`;
  charCount.innerText = `Caracteres: ${text.length}`;
}

editor.addEventListener('input', updateCount);
updateCount();

document.getElementById('clearEditor').addEventListener('click', () => {
  editor.innerHTML = '';
  updateCount();
  document.getElementById('grammarErrors').innerHTML = '';
});

document.getElementById('downloadContent').addEventListener('click', () => {
  const format = prompt('Escolha o formato de download: "pdf", "html" ou "txt"').toLowerCase();
  const content = editor.innerHTML.trim();

  if (format === 'pdf') {
    const doc = new jsPDF();
    doc.html(content, {
      callback: function (doc) {
        doc.save('conteudo.pdf');
      },
      margin: [10, 10, 10, 10],
      autoPaging: true
    });
  } else if (format === 'html') {
    const blob = new Blob([content], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'conteudo.html';
    link.click();
  } else if (format === 'txt') {
    const plainText = editor.innerText;
    const blob = new Blob([plainText], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'conteudo.txt';
    link.click();
  } else {
    alert('Formato inválido!');
  }
});

document.getElementById('checkGrammar').addEventListener('click', async () => {
  const plainText = editor.innerText;

  const response = await fetch('https://api.languagetoolplus.com/v2/check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      text: plainText,
      language: 'pt-BR'
    })
  });

  const result = await response.json();
  const errors = result.matches;
  const grammarErrors = document.getElementById('grammarErrors');
  grammarErrors.innerHTML = '';

  if (errors.length === 0) {
    grammarErrors.innerHTML = '<p><strong>Nenhum erro encontrado.</strong></p>';
    return;
  }

  let content = editor.innerHTML;

  content = content.replace(/<span class="error-highlight">(.*?)<\/span>/g, '$1');

  errors.sort((a, b) => b.context.offset - a.context.offset);

  errors.forEach((match) => {
    const start = match.context.offset;
    const length = match.context.length;
    const error = match.context.text.substring(start, start + length);
    const suggestion = match.replacements[0]?.value || '(sem sugestão)';

    const escapedError = escapeRegExp(error);
    const regex = new RegExp(`(${escapedError})`, 'g');

    content = content.replace(regex, `<span class="error-highlight" title="Sugestão: ${suggestion}" onclick="showSuggestion(event, '${suggestion}')">$1</span>`);
  });

  editor.innerHTML = content;
  updateCount();

  grammarErrors.innerHTML = '<p><strong>Erros destacados no texto acima.</strong></p>';
});

function showSuggestion(event, suggestion) {
  const tooltip = document.createElement('div');
  tooltip.className = 'error-tooltip';
  tooltip.innerText = `Sugestão: ${suggestion}`;
  document.body.appendChild(tooltip);

  const rect = event.target.getBoundingClientRect();
  tooltip.style.top = `${rect.top + window.scrollY - tooltip.offsetHeight - 5}px`;
  tooltip.style.left = `${rect.left + window.scrollX + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;

  tooltip.style.display = 'block';

  setTimeout(() => {
    tooltip.style.display = 'none';
    document.body.removeChild(tooltip);
  }, 3000);
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}