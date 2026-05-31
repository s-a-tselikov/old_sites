/**
 * API формы на том же домене, что и сайт (избегаем CORS и отдельного przdnt-contact).
 * Render: один Web Service (Node), rootDir contact-api — см. render.yaml.
 */
window.CONTACT_FORM_ENDPOINT = window.location.origin + '/api/contact';
