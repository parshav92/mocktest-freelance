export interface AnalyticsSummary {
    total_tests: number;
    avg_percentage: number;
    best_percentage: number;
    total_time_spent_secs: number;
}

export interface PeerOverall {
    student_avg_percentage: number;
    peer_avg_percentage: number;
    delta_percentage: number;
    percentile_rank: number;
    peer_student_count: number;
}

export interface PacingAnalytics {
    pace_vs_allotted_pct: number;
    ended_early_rate_pct: number;
}

export interface EngagementAnalytics {
    avg_tests_per_week: number;
    longest_gap_days: number;
}

export interface SubjectComparisonRow {
    subject_id: string;
    subject_name: string;
    subject_slug: string;
    student_avg_percentage: number;
    peer_avg_percentage: number;
    delta_percentage: number;
    tests_taken: number;
    peer_tests_count: number;
}

export interface ErrorByDifficulty {
    difficulty: "easy" | "medium" | "hard" | string;
    attempts: number;
    wrong_attempts: number;
    wrong_percentage: number;
}

export interface ErrorByQuestionType {
    question_type: string;
    attempts: number;
    wrong_attempts: number;
    wrong_percentage: number;
}

export interface ErrorPatterns {
    by_difficulty: ErrorByDifficulty[];
    by_question_type: ErrorByQuestionType[];
}

export interface TopicBreakdownRow {
    topic: string;
    subtopic: string;
    attempts: number;
    correct_attempts: number;
    accuracy_percentage: number;
    avg_time_spent_secs: number;
}

export interface DailyTrajectoryRow {
    date: string;
    tests_count: number;
    avg_percentage: number;
}

export interface WeeklyTrajectoryRow {
    week_start: string;
    tests_count: number;
    avg_percentage: number;
}

export interface AnalyticsTrajectories {
    daily: DailyTrajectoryRow[];
    weekly: WeeklyTrajectoryRow[];
}

export interface TopicPagination {
    page: number;
    page_size: number;
    total_rows: number;
    total_pages: number;
}

export interface ParentStudentAnalytics {
    summary: AnalyticsSummary;
    peer_overall: PeerOverall;
    pacing: PacingAnalytics;
    engagement: EngagementAnalytics;
    subject_comparison: SubjectComparisonRow[];
    error_patterns: ErrorPatterns;
    topic_breakdown: TopicBreakdownRow[];
    topic_pagination: TopicPagination;
    trajectories: AnalyticsTrajectories;
}

// ── SWOT Analysis ──────────────────────────────────────

export interface SwotTopicRow {
    topic: string;
    subtopic: string;
    student_accuracy: number;
    attempts: number;
    peer_accuracy: number;
    delta: number;
}

export interface SwotSubjectRow {
    subject_id: string;
    subject_name: string;
    student_avg: number;
    peer_avg: number;
    delta: number;
    quadrant: "strength" | "weakness" | "opportunity" | "threat";
}

export interface SwotMeta {
    student_overall_accuracy: number;
    peer_overall_accuracy: number;
    total_topics_analysed: number;
    days_analysed: number;
}

export interface StudentSwot {
    strengths: SwotTopicRow[];
    weaknesses: SwotTopicRow[];
    opportunities: SwotTopicRow[];
    threats: SwotTopicRow[];
    subject_swot: SwotSubjectRow[];
    meta: SwotMeta;
}
