"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface CategoryFilterProps {
    categories: string[];
    selectedCategory: string;
    onSelectCategory: (cat: string) => void;
    showLeftScroll: boolean;
    showRightScroll: boolean;
    onScroll: (dir: "left" | "right") => void;
    containerRef: React.RefObject<HTMLDivElement | null>;
    isDragging: boolean;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
}

export const CategoryFilter = ({
    categories,
    selectedCategory,
    onSelectCategory,
    showLeftScroll,
    showRightScroll,
    onScroll,
    containerRef,
    isDragging,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
}: CategoryFilterProps) => {
    return (
        <div className="mb-5">
            <div className="flex justify-between items-center mb-2">
                <Label className="text-sm">Categories</Label>
                <span className="text-xs text-muted-foreground">← Swipe →</span>
            </div>
            <div className="relative group">
                {showLeftScroll && (
                    <Button
                        variant="secondary"
                        size="icon"
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onScroll("left")}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                )}
                <div
                    ref={containerRef}
                    className="flex gap-2 overflow-x-auto scrollbar-hide px-2 py-1 select-none"
                    style={{
                        scrollbarWidth: "none",
                        WebkitOverflowScrolling: "touch",
                        cursor: isDragging ? "grabbing" : "grab",
                    }}
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onMouseLeave={onMouseLeave}
                >
                    {categories.map((cat) => (
                        <Button
                            key={cat}
                            variant={selectedCategory === cat ? "default" : "outline"}
                            onClick={() => !isDragging && onSelectCategory(cat)}
                            className="whitespace-nowrap text-sm shrink-0 px-4 py-2 h-10"
                        >
                            {cat}
                        </Button>
                    ))}
                </div>
                {showRightScroll && (
                    <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onScroll("right")}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                )}
            </div>
        </div>
    );
};
