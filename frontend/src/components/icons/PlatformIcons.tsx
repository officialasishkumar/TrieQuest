import { Blocks, BookOpen, Braces, Code2, Terminal, Trophy, Workflow } from "lucide-react";

export const LeetCodeIcon = ({ className }: { className?: string }) => <Code2 className={className} />;

export const CodeforcesIcon = ({ className }: { className?: string }) => <Trophy className={className} />;

export const CodeChefIcon = ({ className }: { className?: string }) => <Terminal className={className} />;

export const AtCoderIcon = ({ className }: { className?: string }) => <Braces className={className} />;

export const HackerRankIcon = ({ className }: { className?: string }) => <Workflow className={className} />;

export const GeeksForGeeksIcon = ({ className }: { className?: string }) => <BookOpen className={className} />;

export const CoderIcon = ({ className }: { className?: string }) => <Blocks className={className} />;

export const GenericPlatformIcon = ({ className }: { className?: string }) => <Code2 className={className} />;
