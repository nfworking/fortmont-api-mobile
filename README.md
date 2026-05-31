## Fortmont API Mobile

- ### Getting started with our mobile app as a non-developer
   - For Release and non developers, the project is currently not in a stage where it is stable for even alpha release.
   - If you would like to still try the mobile app, please contact me directly via a github issue, and I will get back to you as soon as possible. 



- ### Getting startd with local development as a developer
    - #### Requirements
 

        - MYsql Server v8.0.0 or higher and open to 0.0.0.0 or LAN ip
        - A mysql user with access for logon from any url
        - A server with 2GB RAM and port 80 open for API server
        - A Azure free account or access to Microsoft Entra ID, with application, users and group creation permisssions
        - Android Studio installed with the Andriod home variable set. 
        - [fortmont-api-web](https://github.com/nfworking/fortmont-api) need to be running via the included Dockerfile and setup using the required environment variables. Note: If you wish to only use username and password auth, ignore Entra_ID setup

    - #### Install Steps
      ```bash
      git clone https://github.com/nfworking/fortmont-api-mobile.git
      cd fortmont-api-mobile
      npm install
      npm run start
      ```

      This will clone the repo, install the dependencies and start the development app on your mobile device or android simulator.

      For detailed instructions on how to setup android studio and your device to be able to install .apk packages, please see the following links:

       - Android Studio Installation Guide: https://developer.android.com/studio/install
       - Android Studio Downloads: https://developer.android.com/studio
       - Expo Environment Setup Guide: https://docs.expo.dev/get-started/set-up-your-environment
      - Expo Android Studio Emulator Guide: https://docs.expo.dev/workflow/android-studio-emulator 


### AI usage Information:
This project was developed by a human developer with assistance from AI tools, primarily GitHub Copilot. The user interface was created using a combination of publicly available design templates, inspiration from the developer's own concepts, and components inspired by Shadcn UI.

AI assistance was used to help adapt and convert interface designs into React Native-compatible implementations. All application logic, architecture, and functionality were designed, reviewed, and validated by the developer. AI-generated code was subject to human review before inclusion in the project.

AI was primarily used as a development aid for tasks such as code suggestions, troubleshooting, and assistance with complex implementation challenges. Final decisions regarding design, functionality, and code quality remained under the developer's control throughout the project.
