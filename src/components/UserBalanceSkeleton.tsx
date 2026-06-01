import React from "react";

export default function UserBalanceSkeleton() {
    return (
        <div className="w-full bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 mb-8 animate-pulse">
            <div className="flex-1 space-y-4 w-full">
                <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                <div className="h-10 bg-slate-200 rounded w-1/2"></div>
            </div>
            <div className="w-12 h-12 bg-slate-100 rounded-full shrink-0"></div>
        </div>
    );
}