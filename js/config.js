window.LinkHive = window.LinkHive || {};

LinkHive.VERSION = '0.1.1';

LinkHive.DEFAULTS = {
  theme: 'catppuccin',
  mode: 'dark',
  defaultView: 'list',
  defaultSort: 'newest',
  storage: 'local',
  githubToken: '',
  githubUser: '',
  githubRepo: '',
  githubBranch: 'main',
  name: '',
  author: '',
  avatar: { type: 'upload', color: '#89b4fa', url: '', dataUrl: '' }
};

LinkHive.APP_NAME = 'linkhive';

LinkHive.STORE = {
  CONFIG: 'linkhive_config'
};

LinkHive.DB = {
  NAME: 'linkhive_db',
  VERSION: 1,
  STORES: {
    COLLECTIONS: 'collections',
    LINKS: 'links',
    SYNC_QUEUE: 'sync_queue'
  }
};

LinkHive.GITHUB_API = 'https://api.github.com';

LinkHive.AVATAR_COLORS = [
  '#89b4fa', '#a6e3a1', '#f9e2af', '#f38ba8', '#cba6f7',
  '#94e2d5', '#fab387', '#74c7ec', '#e64553', '#fe640b',
  '#df8e1d', '#40a02b', '#1e66f5', '#209fb5', '#dd7878',
  '#7287fd', '#ea76cb', '#e6a0f2', '#f2cdcd', '#a6d5e8',
  '#b8cc52', '#8c8fe6', '#d4a373', '#7f8c8d',
  '#e5c890', '#85c1dc', '#a6d189', '#ef9f76',
  '#ca9ee6', '#81c8be', '#e78284', '#babbf1'
];

LinkHive.COLLECTION_COLORS = LinkHive.AVATAR_COLORS;

LinkHive.COLLECTION_ICONS = [
  'bookmark', 'briefcase', 'code-2', 'book-open', 'shopping-cart',
  'gamepad-2', 'music', 'video', 'newspaper', 'lightbulb', 'heart', 'star',
  'globe', 'map', 'camera', 'coffee', 'gift', 'package', 'shield',
  'trophy', 'zap', 'cloud', 'database', 'wifi', 'smartphone',
  'flame', 'send', 'archive', 'lock', 'eye',
  'airplay', 'alarm-clock', 'apple', 'atom', 'bar-chart',
  'bike', 'bot', 'calendar', 'car', 'calculator', 'clipboard',
  'clock', 'compass', 'cpu', 'credit-card', 'dollar-sign', 'dumbbell',
  'file-text', 'flag', 'flask', 'flower', 'glasses', 'graduation-cap',
  'hammer', 'hard-drive', 'headphones', 'image', 'key', 'lamp',
  'mail', 'megaphone', 'message-circle', 'mic', 'monitor', 'mountain',
  'paintbrush', 'paperclip', 'pen-tool', 'phone', 'piggy-bank', 'plane',
  'printer', 'rocket', 'scissors', 'shirt', 'siren', 'target',
  'tent', 'thermometer', 'train', 'tree-pine', 'utensils', 'wallet',
  'wine', 'wrench', 'youtube',
  'activity', 'anchor', 'aperture', 'at-sign', 'award',
  'baby', 'backpack', 'badge', 'banknote', 'battery',
  'beaker', 'bell', 'binoculars', 'bird', 'bone',
  'book', 'boxes', 'brush', 'building', 'bus',
  'candy', 'cat', 'cherry', 'circle', 'clapperboard',
  'clover', 'codesandbox', 'coins', 'command', 'contact',
  'cookie', 'croissant', 'crown', 'dice-5', 'dog',
  'egg', 'feather', 'figma', 'fingerprint', 'fish',
  'gem', 'github',
  'album', 'align-left', 'ampersand', 'angry', 'annoyed',
  'arrow-big-down', 'arrow-big-up', 'arrow-down', 'arrow-left', 'arrow-right', 'arrow-up',
  'axe', 'banana', 'barcode', 'baseline', 'bath', 'bed', 'beer',
  'biohazard', 'bluetooth', 'bomb', 'boom-box', 'brain', 'brick-wall', 'bug',
  'cable', 'cake', 'cassette', 'castle', 'chef-hat', 'chevrons-down', 'chevrons-up',
  'chrome', 'cigarette', 'citrus', 'cloud-drizzle', 'cloud-fog', 'cloud-hail',
  'cloud-lightning', 'cloud-moon', 'cloud-rain', 'cloud-snow', 'cloud-sun',
  'cone', 'construction', 'container', 'copy', 'corner-down-left', 'corner-down-right',
  'corner-up-left', 'corner-up-right', 'crosshair', 'cup-soda', 'delete', 'diamond',
  'disc', 'dna', 'door-closed', 'door-open', 'droplet', 'drum',
  'ear', 'equal', 'eraser', 'euro', 'fan', 'ferris-wheel',
  'file-box', 'file', 'film', 'filter', 'flame-kindling', 'flashlight',
  'flip-horizontal', 'flip-vertical', 'folder-closed', 'folder', 'footprints',
  'forklift', 'framer', 'frown', 'fuel', 'fullscreen', 'gantt-chart', 'ghost',
  'grip', 'hand-metal', 'hand', 'hash', 'haze', 'heading', 'heart-crack',
  'heart-handshake', 'helping-hand', 'hexagon', 'history', 'ice-cream', 'infinity',
  'inspect', 'italic', 'joystick', 'kanban', 'landmark', 'laptop', 'lasso',
  'laugh', 'leaf', 'ligature', 'line-chart', 'link-2', 'linkedin', 'locate',
  'magnet', 'maximize', 'medal', 'meh', 'menu-square', 'microscope', 'milestone',
  'minimize', 'mouse-pointer', 'move', 'navigation', 'network', 'nut', 'octagon',
  'orbit', 'palmtree', 'parking-circle', 'party-popper', 'pause', 'pc-case',
  'percent', 'person-standing', 'picture-in-picture', 'pie-chart', 'pilcrow', 'pill',
  'pin', 'pipette', 'pizza', 'play', 'plug', 'pocket', 'pound-sterling', 'power',
  'presentation', 'puzzle', 'radiation', 'radio', 'rainbow', 'rat', 'receipt',
  'refrigerator', 'replace', 'rss', 'ruler', 'sandwich', 'satellite', 'save',
  'scale', 'scan', 'scroll', 'share', 'shovel', 'shower-head', 'shrink',
  'sigma', 'signal', 'skull', 'smile', 'snowflake', 'sofa', 'sparkles', 'speaker',
  'spline', 'sprout', 'stamp', 'stethoscope', 'swords', 'syringe', 'table',
  'timer', 'toggle-left', 'toggle-right', 'tornado', 'toy-brick', 'traffic-cone',
  'tree-deciduous', 'triangle', 'truck', 'tv', 'umbrella', 'underline', 'unlink',
  'usb', 'vegan', 'venetian-mask', 'volleyball', 'wallpaper', 'wand', 'warehouse',
  'watch', 'waves', 'wind', 'wine-off', 'zoom-in', 'zoom-out',
  'sunrise', 'sunset', 'moon-star', 'languages',
  'si-github', 'si-gitlab', 'si-docker', 'si-kubernetes', 'si-npm', 'si-nodejs',
  'si-python', 'si-rust', 'si-go', 'si-postgresql',
  'si-aws', 'si-netlify', 'si-vercel', 'si-cloudflare', 'si-digitalocean',
  'si-heroku', 'si-flydotio', 'si-x', 'si-discord', 'si-slack', 'si-linkedin',
  'si-reddit', 'si-instagram', 'si-spotify', 'si-twitch', 'si-tiktok',
  'si-bluesky', 'si-figma', 'si-notion', 'si-obsidian', 'si-vscode',
  'si-linear', 'si-raycast', 'si-stripe', 'si-paypal', 'si-gumroad',
  'si-openai', 'si-anthropic', 'si-signal', 'si-telegram', 'si-whatsapp',
  'si-tesla', 'si-microsoft', 'si-servicenow', 'si-powershell', 'si-linux',
  'si-microsoftazure', 'si-atlassian', 'si-android',
  'check', 'check-check', 'badge-check', 'list-checks',
  'car-front', 'car-taxi', 'tractor', 'sailboat', 'gauge', 'steering-wheel'
];
