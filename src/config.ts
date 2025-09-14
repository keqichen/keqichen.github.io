export const SITE = {
  website: "https://keqichen.github.io", 
  author: "Keqi Chen",
  authorEmail: "ckq009@gmail.com",
  profile: "https://github.com/keqichen",
  desc: "A minimal, responsive and SEO-friendly Astro blog theme.",
  title: "Keqi's Log",
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: true,
  postPerIndex: 4,
  postPerPage: 4,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: false,
    text: "Edit page",
    url: "https://github.com/keqichen/technical_blog/edit/main/", // ALSO UPDATE this to correct repo
  },
  dynamicOgImage: true,
  dir: "ltr", // "rtl" | "auto"
  lang: "en", // html lang code. Set this empty and default will be "en"
  timezone: "Europe/London", // Default global timezone (IANA format)
} as const;