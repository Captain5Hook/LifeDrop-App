# GitHub Repository Setup

GitHub repository **About** metadata (description, website link, and topics) cannot be changed from git commits or source files—you must set them manually on GitHub.

---

## Paste Into GitHub Repository **About** Settings

1. Open your repository on GitHub -> click the **gear icon** next to **About** (top-right sidebar).
2. Paste these exact fields:

- **Description:**
  ```text
  LifeDrop: free, offline-ready blood bank finder and first-aid app for India
  ```

- **Website:**
  ```text
  <your .web.app link>
  ```
  *(After deploying Firebase Hosting per `docs/DEPLOY.md`, replace `<your .web.app link>` with `https://aerial-channel-5bpf3.web.app`.)*

- **Topics (add one by one):**
  `blood-donation`, `pwa`, `firebase`, `react`, `india`, `first-aid`, `healthcare`

3. Ensure **Releases**, **Packages**, or unused toggles are configured as desired and click **Save changes**.
