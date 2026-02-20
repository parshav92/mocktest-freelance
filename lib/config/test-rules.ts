// ============================================
// TEST ENVIRONMENT CONFIGURATION
// ============================================
// Single file to configure all test rules,
// anti-cheat settings, and UI behavior.
// ============================================

export const TEST_CONFIG = {
    // ============================================
    // TIMER SETTINGS
    // ============================================
    timer: {
        /** Show seconds in timer (double-click to toggle in UI) */
        showSeconds: true,
        /** Allow hiding the timer */
        allowHideTimer: true,
        /** Warning threshold in seconds (timer turns red) */
        warningThresholdSecs: 300, // 5 minutes
        /** Critical threshold in seconds (timer flashes) */
        criticalThresholdSecs: 60, // 1 minute
        /** Auto-submit when time runs out */
        autoSubmitOnTimeout: true,
    },

    // ============================================
    // GRACE PERIOD (End Test Early)
    // ============================================
    gracePeriod: {
        /** Minutes from test start during which "End Test" is available */
        durationMins: 3,
        /** Show end test button */
        showEndTestButton: true,
    },

    // ============================================
    // QUESTION NAVIGATION
    // ============================================
    navigation: {
        /** Allow navigating back to previous questions */
        allowBackNavigation: true,
        /** Allow jumping to any question from progress grid */
        allowQuestionJump: true,
        /** Auto-save answers on navigation */
        autoSaveOnNavigate: true,
        /** Auto-save debounce delay in ms */
        autoSaveDebounceMs: 500,
    },

    // ============================================
    // FLAG FEATURE
    // ============================================
    flag: {
        /** Enable question flagging */
        enabled: true,
        /** Show flag count in header */
        showFlagCount: true,
    },

    // ============================================
    // PROGRESS SUMMARY
    // ============================================
    progressSummary: {
        /** Show progress grid in header (click to expand) */
        showInHeader: true,
        /** Categories to display */
        categories: {
            showAll: true,
            answered: true,
            notAnswered: true,
            notRead: true, // Questions never navigated to
            flagged: true,
        },
    },

    // ============================================
    // ANTI-CHEAT SETTINGS
    // ============================================
    antiCheat: {
        /** Enable fullscreen mode */
        requireFullscreen: false,
        /** Open test in a new browser tab */
        openInNewTab: true,
        /** Disable right-click context menu */
        disableRightClick: true,
        /** Disable keyboard shortcuts (F12, Ctrl+Shift+I, etc.) */
        disableDevTools: false,
        /** Disable copy/paste from outside */
        disableCopyPaste: false,
        /** Disable text selection on question content */
        disableTextSelection: true,
        /** Track tab/window visibility changes */
        detectTabSwitch: false,
        /** Number of warnings before auto-submit */
        maxWarnings: 10,
        /** Warning message template */
        warningMessage: (remaining: number) =>
            `Warning: Switching tabs or windows is not allowed during the test. You have ${remaining} warning${remaining === 1 ? "" : "s"} remaining before your test is automatically submitted.`,
        /** Final warning message (1 warning left) */
        finalWarningMessage:
            "This is your LAST warning. If you switch tabs again, your test will be automatically submitted.",
        /** Auto-submit message */
        autoSubmitMessage:
            "Your test has been automatically submitted due to repeated tab switching.",
    },

    // ============================================
    // SUBMIT RULES
    // ============================================
    submit: {
        /** Minimum questions that must be attempted before allowing submit */
        minAttemptedPercent: 0, // 0 means no minimum
        /** Show unanswered count in submit confirmation */
        showUnansweredWarning: true,
        /** Show pre-submit summary page */
        showPreSubmitSummary: true,
        /** Show post-submit result screen */
        showPostSubmitResult: true,
    },

    // ============================================
    // INSTRUCTION PAGES
    // ============================================
    instructions: {
        /** Show general navigation instructions (How to navigate) */
        showGeneralInstructions: true,
        /** General instruction pages (shown before subject-specific) */
        generalPages: [
            {
                title: "How to navigate the test?",
                sections: [
                    {
                        heading: "Making things bigger",
                        content:
                            "You can make the questions bigger by clicking the magnifying glass and selecting how big you want them to be. You can always go back to the original view if you want, by clicking the magnifying glass again and clicking '100%'.",
                        visualType: "zoom",
                    },
                    {
                        heading: "Timer",
                        content:
                            "This is your individual countdown timer. Make sure you keep checking the time so that you can complete all the questions. You can click 'Hide time' if you don't want to see the time. Just make sure you are careful in managing your time though! You can double click the timer if you want to see the seconds count down.",
                        visualType: "timer",
                    },
                    {
                        heading: "Scrolling down and changing the view",
                        content:
                            "Sometimes, particularly in the Reading Test, you will have to scroll down using the scroll bar so that you can read the whole question or extract, like in this picture. If you just want to see the question on its own, without the answers, you can click on the arrow you see in the middle of the screen. You can always click the same arrow again to show the answers again.",
                        visualType: "scroll",
                    },
                ],
            },
            {
                title: "How to navigate the test?",
                sections: [
                    {
                        heading: "Next and Back",
                        content:
                            "Once you've selected your answer, you will need to click 'Next' to go to the next question. The test won't automatically take you to the next question. You can use the 'Back' button to review previous questions or change your answers.",
                        visualType: "navigation",
                    },
                    {
                        heading: "Flag feature",
                        content:
                            "If you are finding a question difficult to answer, select your best guess and then click the flag icon to remind yourself to go back to it if you have time.",
                        visualType: "flag",
                    },
                    {
                        heading: "Question number and progress summary",
                        content:
                            "You will always be able to see which question you are up to and how many questions there are in total. If you click the grid icon, it takes you to the progress summary. This shows you where you're up to in the test and reminds you which questions you have flagged to come back to. The progress summary also lets you jump to any question at any time.",
                        visualType: "progress",
                    },
                ],
            },
        ],
        /** Require confirmation before starting test */
        requireStartConfirmation: true,
        /** Confirmation modal text */
        confirmationTitle:
            "Are you sure you have finished reading the instructions?",
        confirmationSubtitle:
            "You will not be able to read them again until the test begins.",
    },

    // ============================================
    // UI THEME
    // ============================================
    theme: {
        /** Primary color (navy blue from reference) */
        primary: "#1a2744",
        /** Accent color */
        accent: "#2563eb",
        /** Header background */
        headerBg: "#f0f4f8",
        /** Question panel background */
        questionPanelBg: "#ffffff",
        /** Selected option border */
        selectedBorder: "#2563eb",
    },

    // ============================================
    // PRACTICE TEST OPTIONS
    // ============================================
    practiceTests: {
        /** Number of practice test options to show per subject */
        optionsPerSubject: 4,
        /** Label template */
        labelTemplate: (n: number) => `Practice Test ${n}`,
    },
} as const;

// Type for instruction page from DB
export interface DBInstructionPage {
    title: string;
    content: string;
}

// Type for general instruction sections
export interface InstructionSection {
    heading: string;
    content: string;
    visualType?: "navigation" | "flag" | "progress" | "timer" | "scroll" | "zoom";
}

export interface GeneralInstructionPage {
    title: string;
    sections: InstructionSection[];
}
