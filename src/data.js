export const profile = {
  name: 'Marin Grabovac',
  firstName: 'Marin',
  lastName: 'Grabovac',
  role: 'Computer science student',
  current: 'Master’s studies · FOI',
  focus: 'Software development & QA · MT-lab',
  intro: 'I build software across web, mobile and desktop, and test how it holds up in practice.',
  about: 'I study at the Faculty of Organization and Informatics and work on software development and quality assurance at MT-lab. I enjoy following an idea from implementation to testing and working with a team to make it dependable.',
  url: 'https://mgrabovac22.github.io/',
  github: 'https://github.com/mgrabovac22',
  email: 'grabovacmarin000@gmail.com',
  linkedin: 'https://www.linkedin.com/in/marin-grabovac-7bb447260/',
  cv: { file: 'files/Marin-Grabovac-CV.pdf' },
  portrait: { image: 'art/marin-portrait.webp', drawing: 'art/portrait.svg' },
};

export const projects = [
  {
    id: 'gitswamp', name: 'GitSwamp', type: 'Open-source desktop application',
    description: 'A Tauri desktop application for managing Git repositories in everyday development.',
    points: ['Designed the application around routine repository management.', 'Released the project as open source.'],
    stack: ['Tauri', 'Git'],
  },
  {
    id: 'iris', name: 'Iris', type: 'Deep learning',
    description: 'An iris-recognition system built with deep learning.',
    points: ['Sourced data for the recognition task.', 'Trained and evaluated the model.'],
    stack: ['Deep learning'],
  },
  {
    id: 're-injector', name: 'RE-injector', type: 'WordPress plugin',
    description: 'A PHP plugin built during my internship at Karydia to bring data from an external API into a WordPress website.',
    points: ['Automated the transfer from the API endpoint.', 'Built WordPress templates to display the integrated data.'],
    stack: ['PHP', 'WordPress', 'REST API'],
  },
  {
    id: 'quizly', name: 'Quizly', type: 'Web application',
    description: 'A Laravel web application for creating custom quizzes and running live quiz competitions.',
    points: ['Implemented quiz creation.', 'Added a competition mode inspired by Kahoot.'],
    stack: ['PHP', 'Laravel'],
  },
  {
    id: 'otpstudent', name: 'OTPStudent', type: 'Android application',
    description: 'A Kotlin application built in collaboration with OTP Bank for students applying to internships and jobs.',
    points: ['Built the Android interface with Jetpack Compose.', 'Focused the app on the internship and job application process.'],
    stack: ['Kotlin', 'Jetpack Compose', 'Android'],
  },
  {
    id: 'forge-static', name: 'Forge Static', type: 'Web application',
    description: 'A modular web application for managing information about actors and other people in the film industry.',
    points: ['Built with Angular and Node.js in TypeScript.', 'Designed the modules to work with the TMDB API.'],
    stack: ['TypeScript', 'Angular', 'Node.js', 'TMDB API'],
  },
  {
    id: 'cityinfo', name: 'CityInfo', type: 'Windows desktop application',
    description: 'A WPF ticketing application for municipal support.',
    points: ['Built the desktop interface in XAML and .NET.', 'Structured the application as modules for municipal administration.'],
    stack: ['.NET', 'WPF', 'XAML'],
  },
  {
    id: 'crovote', name: 'CroVote', type: 'Web application',
    description: 'A Node.js voting system with separate administrator and voter roles.',
    points: ['Implemented role-based access.', 'Added safeguards for voting and application integrity.'],
    stack: ['Node.js', 'Security'],
  },
  {
    id: 'voyager', name: 'Voyager', type: 'Cross-platform mobile application',
    description: 'A Flutter application that recommends places to visit along a route.',
    points: ['Included navigation and the ability to add stops.', 'Added trip statistics.'],
    stack: ['Flutter', 'Navigation'],
  },
  {
    id: 'axonman', name: 'AxonMan', type: 'Oracle APEX application',
    description: 'An Oracle APEX application for managing a medical laboratory.',
    points: ['Analyzed how the laboratory operated and identified gaps in the workflow.', 'Implemented digital workflows to address those gaps.'],
    stack: ['Oracle APEX'],
  },
  {
    id: 'portfolio', name: 'The Portfolio World', type: 'Interactive web portfolio',
    description: 'This site combines a procedural 3D office, a scroll-driven camera and a portrait drawn by an animated pen.',
    points: ['Built the models and office props in Three.js.', 'Synchronized the pen tip with SVG paths and kept profile content in accessible HTML.'],
    stack: ['Three.js', 'Vite', 'SVG'],
    github: 'https://github.com/mgrabovac22/mgrabovac22.github.io',
  },
];

export const experience = [
  {
    id: 'mt-lab', title: 'Development Engineer & QA Tester', organization: 'MT-lab · Faculty of Organization and Informatics', dates: '2023–present',
    description: 'Software development and quality assurance for mobile and web applications in a faculty lab.',
    points: ['Tested functionality and user experience for the Obitelj 3plus association’s web application.', 'Developed internal Android applications and contributed to the design and implementation of new solutions.'],
    stack: ['Android', 'Web QA'],
  },
  {
    id: 'knauf', title: '.NET Developer', organization: 'Knauf Insulation d.o.o.', dates: 'Sep 2025–Aug 2026',
    description: 'Developed and maintained KI Expert Plus.',
    points: ['Implemented new features and refined existing algorithms.', 'Maintained the application, resolved bugs and provided technical support to users.'],
    stack: ['.NET', 'KI Expert Plus'],
  },
  {
    id: 'karydia', title: 'Web Developer Intern', organization: 'Karydia d.o.o.', dates: 'Apr–Jun 2025',
    description: 'Built a WordPress integration during a professional internship.',
    points: ['Created a PHP plugin to automate data transfer from an external system to the WordPress website.', 'Wrote custom templates to present the imported data in a structured format.'],
    stack: ['PHP', 'WordPress', 'API integration'],
  },
  {
    id: 'infodom', title: 'Oracle Developer', organization: 'InfoDom d.o.o.', dates: 'Sep–Oct 2024',
    description: 'Worked on database development and system support with Oracle technologies.',
    points: ['Used PL/SQL for database and system work.', 'Used Oracle APEX, BI Publisher and Oracle SQL Developer in development and implementation.'],
    stack: ['PL/SQL', 'Oracle APEX', 'BI Publisher', 'SQL Developer'],
  },
];

export const education = [
  {
    id: 'foi', title: 'Faculty of Organization and Informatics', organization: 'Information and Business Systems · Information and Software Engineering',
    dates: '2022–present', description: 'Bachelor’s studies in Information and Business Systems and master’s studies in Information and Software Engineering.',
    points: ['Magna cum laude.', 'Coursework and interests include databases, web development, software engineering and software systems security.'],
  },
  {
    id: 'vitez', title: 'Srednja škola Vitez', organization: 'General grammar school', dates: '2018–2022',
    description: 'Completed a general secondary education program.',
  },
];

export const skills = [
  { title: 'Programming languages', items: ['TypeScript', 'C#', 'Python', 'C++', 'C', 'PHP', 'Java', 'Swift', 'Go', 'Kotlin'] },
  { title: 'Web development', items: ['JavaScript', 'Angular', 'Node.js', 'HTML', 'CSS', 'SCSS', 'ASP.NET', 'React', 'Blazor', 'npm', 'Bootstrap', 'WordPress', 'Laravel', 'Vue.js', 'Next.js'] },
  { title: 'Desktop & mobile', items: ['.NET Framework', 'Entity Framework', 'Windows Forms', 'WPF', 'XAML', 'Tauri', 'Jetpack Compose', 'Flutter'] },
  { title: 'Data & database development', items: ['MySQL', 'SQL Server', 'SQLite', 'Oracle APEX', 'PL/SQL', 'MongoDB', 'PostgreSQL'] },
  { title: 'Development tools', items: ['Visual Studio', 'Figma', 'Payara', 'WebSphere', 'Wireshark', 'DaVinci', 'Camunda', 'Bizagi', 'Oracle SQL Developer', 'BI Publisher'] },
  { title: 'Version control & collaboration', items: ['Git', 'GitHub', 'GitSwamp', 'GitKraken', 'GitLab', 'Bitbucket', 'Jira', 'Teams', 'Confluence', 'Azure DevOps', 'Slack', 'Obsidian'] },
];

export const towers = [
  { mark: '.NET', name: '.NET Framework', level: 3 },
  { mark: 'TS', name: 'TypeScript', level: 3 },
  { mark: 'PY', name: 'Python', level: 3 },
  { mark: 'PHP', name: 'PHP', level: 2 },
  { mark: 'ORA', name: 'Oracle APEX', level: 2 },
  { mark: 'KT', name: 'Kotlin', level: 1 },
  { mark: 'GO', name: 'Go', level: 1 },
  { mark: 'PG', name: 'PostgreSQL', level: 1 },
];

export const credentials = [
  'WordPress fundamentals certificate',
  'Digital Innovation Incubator · fourth-place recognition',
  'Lumen Development competition · semifinal certificate',
  'Google Ads for Beginners certificate',
  'FINA Academy · software testing diploma',
  'Themed ETF design competition diploma',
];

export const volunteering = [
  'Kruh svetog Ante · community food bank',
  'RoboCup 2023 European Championship',
  'Member of the FOI Volunteer Centre',
];

export const languages = ['Croatian · native', 'English · fluent', 'German · basic'];
export const softSkills = ['Critical thinking', 'Communication', 'Presentations', 'Adaptability', 'Problem solving', 'Time management'];
export const interests = ['Film', 'Video games', 'Football', 'Hiking'];

export const stops = [
  { id: 'about', title: 'About', place: 'The Studio', tag: 'Personal introduction', position: [0, 0], description: profile.about, exhibit: 'Workstation' },
  { id: 'career', title: 'Career', place: 'The Office', tag: 'Professional timeline', position: [15, -9], description: 'My work spans software development, QA, database development and technical support.', exhibit: 'Meeting table' },
  { id: 'projects', title: 'Projects', place: 'The Workshop', tag: 'Selected work', position: [30, -18], description: 'A selection of projects from my studies, lab work and internships.', exhibit: 'Prototype desk' },
  { id: 'qualifications', title: 'Qualifications', place: 'The Lab', tag: 'Technologies & certificates', position: [45, -27], description: 'Each labeled column follows the one-to-three-star scale used for technical skills in my CV.', exhibit: 'Technology columns' },
  { id: 'education', title: 'Education', place: 'The Library', tag: 'Study & volunteering', position: [60, -36], description: 'My studies cover information systems, software engineering and application development.', exhibit: 'Reading desk' },
  { id: 'contact', title: 'Contact', place: 'The Postroom', tag: 'Find me online', position: [75, -45], description: 'Get in touch by email or LinkedIn, or explore the repositories on GitHub.', exhibit: 'Correspondence desk' },
];

export const number = index => String(index + 1).padStart(2, '0');
