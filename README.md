# Odo Landing Page

Beta recruitment landing page for Odo: Simple Mileage Tracking.

## Setup

1. Add your assets to the `assets/` folder:
   - `icon.png` - App icon (512x512 recommended)
   - `screenshot.png` - App screenshot for hero section

2. Update the Google Play link in `index.html` (search for `play.google.com`)

3. Update email address if needed (search for `contact@odometer.pro`)

## Deploy to GitHub Pages

1. Create a new repository on GitHub

2. Push this folder:
   ```bash
   cd landing-page
   git init
   git add .
   git commit -m "Initial landing page"
   git branch -M main
   git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

3. Go to repository Settings > Pages

4. Set source to "Deploy from a branch" > `main` > `/ (root)`

5. Your site will be live at `https://YOUR_USERNAME.github.io/YOUR_REPO/`

## Custom Domain (Optional)

1. Add a `CNAME` file with your domain:
   ```
   odo.yourdomain.com
   ```

2. Configure DNS at your domain registrar

## Files

- `index.html` - Main landing page
- `privacy.html` - Privacy policy
- `assets/` - Images (icon, screenshot)
