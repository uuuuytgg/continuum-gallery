# Continuum Gallery

An interactive static photo gallery for GitHub Pages.

## Local Preview

Open `index.html` directly in a browser, or serve the folder with any static server.

## Deploy To GitHub Pages

1. Create a new GitHub repository, for example `continuum-gallery`.
2. Push this folder to the repository's `main` branch.
3. In GitHub, open **Settings > Pages** and choose **GitHub Actions** as the source.
4. The included workflow deploys the static site.

## Google Photos Picker

1. Open Google Cloud Console.
2. Enable **Google Photos Picker API**.
3. Create an OAuth 2.0 Web Client ID.
4. Add your GitHub Pages origin to **Authorized JavaScript origins**, for example:

   `https://YOUR_USER.github.io`

5. Open the deployed site, press **Photos**, paste the Client ID, save, then choose photos.

The app uses the Google Photos Picker API with the `https://www.googleapis.com/auth/photospicker.mediaitems.readonly` scope. Picked media URLs expire, so imported images are displayed as browser object URLs for the current session.
