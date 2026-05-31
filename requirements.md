# Requirements Document

## Introduction

The ServiceNow Certification Study App is a cross-platform mobile application for iPhone and Android that helps users prepare for ServiceNow certification exams. The app provides structured study materials, practice questions, flashcards, progress tracking, and exam simulations covering the full range of ServiceNow certification paths (e.g., CSA, CIS, CAD, CIS-ITSM, CIS-HR, etc.). Users can study on the go, track their readiness, and identify knowledge gaps before sitting for official exams.

## Glossary

- **App**: The ServiceNow Certification Study App (iOS and Android mobile application)
- **User**: A registered person using the App to study for ServiceNow certifications
- **Exam**: A ServiceNow official certification exam (e.g., CSA, CAD, CIS-ITSM)
- **Question**: A multiple-choice or scenario-based practice question associated with an Exam
- **Flashcard**: A two-sided study card with a term or concept on one side and its definition or explanation on the other
- **Quiz**: A timed or untimed session presenting a subset of Questions to the User
- **Study_Session**: A single continuous period of study activity within the App
- **Progress_Tracker**: The component that records and displays a User's performance metrics over time
- **Deck**: A named collection of Flashcards associated with a specific Exam or topic
- **Bookmark**: A User-saved Question or Flashcard for later review
- **Leaderboard**: A ranked display of Users based on quiz scores or study streaks
- **Streak**: The count of consecutive days a User has completed at least one Study_Session
- **Notification**: A push notification sent to the User's device by the App
- **Exam_Simulator**: A timed, full-length mock exam that replicates official exam conditions

---

## Requirements

### Requirement 1: User Registration and Authentication

**User Story:** As a new user, I want to create an account and log in securely, so that my study progress is saved and accessible across devices.

#### Acceptance Criteria

1. WHEN a user submits a valid email address (RFC 5322 format) and a password between 8 and 128 characters, THE App SHALL create a new account and send a verification email to that address.
2. WHEN a user submits an email address that is already registered, THE App SHALL display an error message indicating the email is already in use.
3. WHEN a user submits a password shorter than 8 characters or longer than 128 characters, THE App SHALL display an error message specifying the password length requirements.
4. WHEN a user taps the verification link in the verification email and no active authentication system errors are present, THE App SHALL activate the account and allow the user to log in.
5. IF active authentication system errors are present when a user taps the verification link, THEN THE App SHALL block account activation and display an error message instructing the user to try again later.
6. WHEN a user provides valid credentials and the account is verified, THE App SHALL authenticate the user and navigate to the home screen within 3 seconds.
7. IF authentication has not completed within 3 seconds, THEN THE App SHALL cancel the attempt and display a timeout error message.
8. WHEN a user attempts to log in with a valid email and password but the account has not been verified, THE App SHALL display an error message indicating the account is unverified and offer to resend the verification email.
9. WHEN a user provides invalid credentials, THE App SHALL display an error message and increment a failed-attempt counter for that account.
10. IF a user's failed-attempt counter reaches 5 within a 10-minute window, THEN THE App SHALL lock the account for 15 minutes and notify the user via email.
11. WHEN a user requests a password reset, THE App SHALL send a reset link to the registered email address that expires after 30 minutes.
12. WHERE social login is enabled, THE App SHALL allow users to authenticate using Google or Apple Sign-In.
13. IF a social login attempt fails due to a provider error, THEN THE App SHALL display an error message identifying the provider and offer the user the option to log in with email and password instead.
14. WHILE a user is authenticated, THE App SHALL maintain the session for 30 days unless the user explicitly logs out.

---

### Requirement 2: Exam and Topic Selection

**User Story:** As a user, I want to browse and select the ServiceNow certification exam I am preparing for, so that I receive relevant study content.

#### Acceptance Criteria

1. THE App SHALL display a catalog of all supported ServiceNow certification exams, including exam name, certification level, and estimated study time in hours.
2. WHEN a user selects an Exam from the catalog, THE App SHALL display the exam's topic domains, their weighting percentages, and the total number of available Questions.
3. WHEN a user taps the enroll action for an Exam, THE App SHALL add that Exam to the user's active study list and initialize a Progress_Tracker for it.
4. IF enrollment fails due to a system error, THEN THE App SHALL display an error message and leave the user's active study list unchanged.
5. WHILE a user is enrolled in an Exam, THE App SHALL allow the user to select individual topic domains, and the selected domain SHALL filter subsequent Quiz and Flashcard sessions to Questions and Flashcards tagged with that domain.
6. IF a user attempts to enroll in more than 5 active Exams simultaneously, THEN THE App SHALL display a warning and require the user to remove an existing Exam before adding a new one.
7. WHEN an Exam's content is updated, THE App SHALL notify enrolled users who have downloaded that Exam's content for offline use and update the downloaded content within 24 hours.

---

### Requirement 3: Practice Questions

**User Story:** As a user, I want to answer practice questions for my chosen exam, so that I can test my knowledge and identify weak areas.

#### Acceptance Criteria

1. WHEN a user starts a Quiz, THE App SHALL present Questions one at a time with a minimum of 4 answer choices per Question.
2. WHEN a user selects an answer, THE App SHALL indicate whether the answer is correct or incorrect within 500 milliseconds and display an explanation that includes the correct answer and the reason it is correct.
3. WHEN a user completes a Quiz, THE App SHALL display a summary showing the number of correct answers, incorrect answers, and overall score as a percentage.
4. THE App SHALL tag each Question with one or more topic domain labels so that the Progress_Tracker can attribute performance to specific domains.
5. WHEN a user answers a Question incorrectly, THE App SHALL add that Question to a dedicated "Review" queue for the user.
6. WHEN a user views the Review queue, THE App SHALL present Questions ordered by the number of times the user has answered them incorrectly, descending.
7. THE App SHALL provide a minimum of 200 unique Questions per supported Exam.
8. IF a user has answered all available Questions for an Exam at least once, THEN THE App SHALL reset the Question pool so that all Questions become eligible for presentation again.
9. WHEN the Question pool is reset, THE App SHALL notify the user that the pool has been refreshed.
10. WHERE a Question contains an image or diagram, THE App SHALL render the image at the full width of the question card.
11. THE App SHALL provide an accessible text description for every Question, including Questions that do not contain images.

---

### Requirement 4: Flashcards

**User Story:** As a user, I want to study with flashcards, so that I can memorize key terms and concepts efficiently.

#### Acceptance Criteria

1. THE App SHALL organize Flashcards into Decks, where each Deck is associated with a specific Exam or topic domain.
2. WHEN a user opens a Deck, THE App SHALL present Flashcards in a swipeable card interface, showing the term side by default.
3. IF a Deck contains no Flashcards, THEN THE App SHALL display a message indicating the Deck is empty and offer the user the option to create a new Flashcard.
4. WHEN a user taps a Flashcard, THE App SHALL flip the card to reveal the definition or explanation side with an animation completing within 300 milliseconds.
5. WHEN a user swipes a Flashcard right, THE App SHALL mark it as "Known" and remove it from the current session's active card pool.
6. WHEN a user swipes a Flashcard left, THE App SHALL mark it as "Still Learning" and re-insert it at a position at least 3 cards ahead of the current position in the session's card pool.
7. WHEN a user completes a Deck session, THE App SHALL display a summary showing the count of "Known" and "Still Learning" cards.
8. THE App SHALL implement a spaced repetition algorithm so that the inter-session review interval for a Flashcard marked "Still Learning" is no more than 50% of the interval for a Flashcard marked "Known".
9. WHEN a user creates a custom Flashcard, THE App SHALL save it to a user-defined Deck and make it available in future Study_Sessions.
10. IF a custom Flashcard's term field or definition field is empty, THEN THE App SHALL prevent saving and display a validation error identifying the empty field.

---

### Requirement 5: Exam Simulator

**User Story:** As a user, I want to take a full-length timed mock exam, so that I can experience realistic exam conditions and assess my readiness.

#### Acceptance Criteria

1. WHEN a user starts an Exam_Simulator session, THE App SHALL present the configured number of Questions for that Exam within a countdown timer set to the official exam duration.
2. WHILE an Exam_Simulator session is active, THE App SHALL display the remaining time in a fixed position that is always visible without scrolling and update it every second.
3. WHILE an Exam_Simulator session is active, THE App SHALL allow the user to flag individual Questions for review before final submission.
4. WHEN the countdown timer reaches zero, THE App SHALL automatically submit the Exam_Simulator session and display the results.
5. WHEN a user manually submits an Exam_Simulator session, THE App SHALL display a confirmation dialog showing the count of unanswered Questions and flagged Questions before finalizing submission.
6. WHEN an Exam_Simulator session is submitted, THE App SHALL display a results report including overall score, pass/fail status based on the official passing threshold, per-domain score breakdown, and a list of incorrectly answered Questions with explanations.
7. THE App SHALL store the results of each Exam_Simulator session in the user's history for a minimum of 90 days.
8. IF a user exits the App during an active Exam_Simulator session, THEN THE App SHALL pause the timer and resume the session from the same state when the user returns.
9. IF the App cannot restore the Exam_Simulator session state when the user returns, THEN THE App SHALL display an error message and offer the user the option to restart the session or discard it.

---

### Requirement 6: Progress Tracking and Analytics

**User Story:** As a user, I want to see my study progress and performance analytics, so that I can focus my efforts on weak areas and measure improvement over time.

#### Acceptance Criteria

1. THE Progress_Tracker SHALL record the score, date, and duration of every session in which the user submits all Questions or explicitly ends the session.
2. WHEN a user views the progress dashboard for an Exam, THE App SHALL display a per-domain accuracy chart showing the percentage of correctly answered Questions for each topic domain.
3. WHEN a user views the progress dashboard, THE App SHALL display a study activity calendar showing days on which the user completed at least one Study_Session, based on data recorded at the time of each Study_Session completion.
4. THE App SHALL calculate a readiness score between 0 and 100 for each enrolled Exam using only Quiz and Exam_Simulator sessions completed within the last 30 days, weighted by domain importance.
5. THE App SHALL cap the readiness score at a maximum value of 100 and display it on the progress dashboard.
6. WHEN a user's readiness score for an Exam first reaches 80, THE App SHALL display a notification recommending the user schedule the official exam; IF the user dismisses the notification, THE App SHALL not re-send it unless the score drops below 80 and subsequently reaches 80 again.
7. THE Progress_Tracker SHALL maintain a Streak counter that increments by 1 for each calendar day, based on the device's local timezone, on which the user completes at least one Study_Session and resets to 0 if a calendar day passes with no Study_Session completed.
8. WHEN a user views their profile, THE App SHALL display their current Streak, longest Streak, total Questions answered, and total Study_Sessions completed.
9. IF no Quiz or Exam_Simulator session data exists for an Exam, THEN THE App SHALL display an empty-state message on the progress dashboard indicating that no study data is available yet.

---

### Requirement 7: Bookmarks and Review Lists

**User Story:** As a user, I want to bookmark questions and flashcards for later review, so that I can quickly return to content I find challenging or important.

#### Acceptance Criteria

1. WHEN a user taps the bookmark icon on a Question or Flashcard, THE App SHALL add that item to the user's Bookmark list and transition the bookmark icon to its active (filled) state within 500 milliseconds.
2. WHEN a user taps the bookmark icon on an already-bookmarked item, THE App SHALL remove the Bookmark and transition the bookmark icon to its inactive (unfilled) state within 500 milliseconds.
3. WHEN a user views the Bookmark list, THE App SHALL display all bookmarked Questions and Flashcards grouped by Exam and sorted by the date they were bookmarked, most recent first.
4. WHEN a user starts a Quiz or Flashcard session from the Bookmark list for a given Exam, THE App SHALL present only the bookmarked items for that Exam.
5. IF a user attempts to start a Quiz or Flashcard session from the Bookmark list for an Exam that has no bookmarked items, THEN THE App SHALL display a message indicating there are no bookmarks for that Exam and prevent the session from starting.
6. THE App SHALL synchronize Bookmark data across all devices where the user is logged in within 30 seconds of the bookmark action, provided the device has an active internet connection.

---

### Requirement 8: Notifications and Study Reminders

**User Story:** As a user, I want to receive study reminders and motivational notifications, so that I stay consistent with my study schedule.

#### Acceptance Criteria

1. WHEN a user enables study reminders, THE App SHALL send a Notification at the user-configured time each day.
2. WHEN a user's Streak is at risk of being broken (i.e., the user has not completed a Study_Session by 8 PM local time), THE App SHALL send a reminder Notification.
3. WHEN a user's readiness score increases by 10 or more points since the last congratulatory Notification, or since enrollment if no congratulatory Notification has been sent, THE App SHALL send a congratulatory Notification; THE App SHALL not send more than one congratulatory Notification per 24-hour period per Exam.
4. THE App SHALL allow the user to configure the daily reminder time, enable or disable each Notification type individually, and set quiet hours spanning no more than 12 consecutive hours during which no Notifications are sent; IF a scheduled reminder falls within the configured quiet hours, THE App SHALL reschedule it to the first minute after the quiet hours end.
5. IF a user has disabled all Notifications in the device's system settings, THEN THE App SHALL not attempt to send Notifications and SHALL display an in-app prompt explaining how to re-enable them in the device settings.
6. WHEN a daily reminder Notification is tapped, THE App SHALL open to the home screen. WHEN a streak-risk Notification is tapped, THE App SHALL open to the active study list. WHEN a congratulatory Notification is tapped, THE App SHALL open to the progress dashboard for the relevant Exam.

---

### Requirement 9: Offline Access

**User Story:** As a user, I want to study without an internet connection, so that I can prepare for exams while traveling or in areas with limited connectivity.

#### Acceptance Criteria

1. WHEN a user downloads an Exam's content for offline use, THE App SHALL store all Questions, Flashcards, and Decks for that Exam on the device.
2. IF the device has insufficient storage to complete a download, THEN THE App SHALL display an error message stating the required and available storage space and halt the download without partially storing content.
3. WHILE the device has no internet connection, THE App SHALL allow the user to complete Quizzes, Flashcard sessions, and Exam_Simulator sessions using downloaded content.
4. WHILE the device has no internet connection, THE App SHALL queue all Progress_Tracker updates locally.
5. WHEN the device reconnects to the internet and maintains a stable connection for at least 5 consecutive seconds, THE App SHALL begin synchronizing all queued Progress_Tracker updates to the server within 60 seconds and continue until all updates are synchronized.
6. IF synchronization is interrupted before all updates are sent, THEN THE App SHALL retry synchronization the next time the device establishes a stable connection.
7. WHILE the device has no internet connection, THE App SHALL display a visible offline status label in the app header.
8. IF downloaded content for an Exam is more than 30 days old, THEN THE App SHALL display a warning prompting the user to refresh the content when a connection is available.

---

### Requirement 10: Accessibility

**User Story:** As a user with accessibility needs, I want the app to support assistive technologies and adjustable display settings, so that I can study comfortably regardless of my abilities.

#### Acceptance Criteria

1. THE App SHALL support VoiceOver (iOS) and TalkBack (Android) screen readers by providing a label for every interactive element that describes its purpose or action, and by announcing dynamic content changes via accessibility live regions.
2. THE App SHALL support Dynamic Type (iOS) and font scaling (Android) for system font sizes from 100% to 200%, such that all text remains fully visible without truncation, clipping, or overlap at any size within that range.
3. WHILE high-contrast mode is enabled, THE App SHALL render all text and interactive elements with a contrast ratio of at least 4.5:1 as required by WCAG 2.1 AA.
4. THE App SHALL not rely solely on color to convey information; all color-coded indicators SHALL include both a text label and an icon.
5. WHEN a user activates high-contrast mode, THE App SHALL apply the high-contrast theme to all screens within 500 milliseconds.

---

### Requirement 11: Legal Compliance, Branding, and Content Provenance

**User Story:** As the App's publisher, I want the App's name, branding, and study content to clearly indicate its independent status and original authorship, so that the App complies with ServiceNow's trademark policy, satisfies App Store and Google Play review, and remains defensible if challenged.

#### Acceptance Criteria

1. THE App's display name, App Store / Google Play listing title, and marketing copy SHALL NOT use "ServiceNow" as a leading or standalone term, and SHALL NOT use any ServiceNow trademark in a way that implies official affiliation, endorsement, or approval.
2. THE App SHALL display the disclaimer "Unofficial. Not affiliated with or endorsed by ServiceNow, Inc." on the splash screen, on the About screen within Settings, and in the App Store and Google Play listing descriptions.
3. THE App SHALL NOT use ServiceNow logos, official iconography, the ServiceNow brand color palette (including but not limited to the ServiceNow brand green), or visual replicas of ServiceNow product UI.
4. THE App SHALL NOT present any Question whose text, answer choices, or explanation reproduces, verbatim or in near-identical paraphrase, content from any official ServiceNow exam, NDA-protected material, or material distributed under ServiceNow Now Learning license terms that prohibit redistribution.
5. Each Question record SHALL be associated with a blueprint skill identifier referencing an entry in the published exam blueprint for its Exam, so that the origin of every Question can be traced to a public, citable source.
6. Each Question record SHALL carry a review status of "draft," "reviewed," or "published," and only Questions with status "published" SHALL be presented to users in Quizzes, Flashcard sessions, or Exam_Simulator sessions.
7. WHERE a Question's explanation cites external material (ServiceNow product documentation, community articles, etc.), THE Question record SHALL retain a source citation in its authoring metadata, and the cited material SHALL be from sources whose terms permit such reference.
8. WHEN a user opens the App for the first time after install, THE App SHALL display the unofficial-status disclaimer and require an explicit acknowledgement before proceeding to the home screen.
