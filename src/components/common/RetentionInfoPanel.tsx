import React from 'react';
import { Request } from '@/types';
import { calculateDisposalDate, formatRetention, formatCutoff } from '@/ssic-data';

interface RetentionInfoPanelProps {
  request: Request;
}

export const RetentionInfoPanel: React.FC<RetentionInfoPanelProps> = ({ request }) => {
  // If no SSIC data, show placeholder
  if (!request.ssic) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-center">
        <div className="text-[var(--muted)] text-sm">
          No retention schedule assigned
        </div>
        <div className="text-xs text-[var(--muted)] mt-1">
          SSIC classification was not set when this request was created
        </div>
      </div>
    );
  }

  // Calculate disposal date if possible
  const recordDate = new Date(request.createdAt);
  const ssicRecord = {
    ssic: request.ssic,
    nomenclature: request.ssicNomenclature || '',
    bucket: request.ssicBucket || '',
    bucketTitle: request.ssicBucketTitle || '',
    dau: request.dau || '',
    isPermanent: request.isPermanent || false,
    cutoffTrigger: (request.cutoffTrigger || 'CALENDAR_YEAR') as any,
    cutoffDescription: request.cutoffDescription || '',
    retentionValue: request.retentionValue ?? null,
    retentionUnit: (request.retentionUnit || 'YEARS') as any,
    disposalAction: (request.disposalAction || 'DESTROY') as any,
    dispositionText: '',
    seriesTitle: '',
  };

  const disposalDate = calculateDisposalDate(ssicRecord, recordDate);

  const isPermanent = request.isPermanent || false;

  return (
    <div className="space-y-4">
      {/* Classification Header */}
      <div className={`p-4 rounded-lg ${isPermanent ? 'bg-blue-50 border border-blue-200' : 'bg-amber-50 border border-amber-200'}`}>
        <div className="flex items-start gap-3">
          <div className={`text-2xl ${isPermanent ? 'text-blue-600' : 'text-amber-600'}`}>
            {isPermanent ? '📁' : '⏱️'}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-[var(--text)]">
              {request.ssic} - {request.ssicNomenclature}
            </div>
            {request.ssicBucketTitle && (
              <div className="text-sm text-[var(--muted)] mt-1">
                {request.ssicBucketTitle}
              </div>
            )}
            <div className={`text-xs font-medium uppercase tracking-wide mt-2 ${isPermanent ? 'text-blue-600' : 'text-amber-600'}`}>
              {isPermanent ? 'Permanent Record' : 'Temporary Record'}
            </div>
          </div>
        </div>
      </div>

      {/* Retention Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[var(--surface)] p-3 rounded-lg border border-brand-navy/10">
          <div className="text-xs text-[var(--muted)] uppercase tracking-wide mb-1">Retention Period</div>
          <div className="font-medium text-[var(--text)]">
            {formatRetention(ssicRecord)}
          </div>
        </div>

        <div className="bg-[var(--surface)] p-3 rounded-lg border border-brand-navy/10">
          <div className="text-xs text-[var(--muted)] uppercase tracking-wide mb-1">Cutoff Trigger</div>
          <div className="font-medium text-[var(--text)]">
            {formatCutoff(ssicRecord.cutoffTrigger)}
          </div>
          {request.cutoffDescription && (
            <div className="text-xs text-[var(--muted)] mt-1">
              {request.cutoffDescription}
            </div>
          )}
        </div>

        <div className="bg-[var(--surface)] p-3 rounded-lg border border-brand-navy/10">
          <div className="text-xs text-[var(--muted)] uppercase tracking-wide mb-1">Disposal Action</div>
          <div className="font-medium text-[var(--text)]">
            {isPermanent ? 'Transfer to National Archives' : 'Destroy'}
          </div>
        </div>

        <div className="bg-[var(--surface)] p-3 rounded-lg border border-brand-navy/10">
          <div className="text-xs text-[var(--muted)] uppercase tracking-wide mb-1">Record Created</div>
          <div className="font-medium text-[var(--text)]">
            {recordDate.toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Disposal Date Calculation */}
      {!isPermanent && (
        <div className="p-4 bg-[var(--surface)] rounded-lg border border-brand-navy/10">
          <div className="text-xs text-[var(--muted)] uppercase tracking-wide mb-2">Estimated Disposal Eligibility</div>
          {disposalDate ? (
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold text-brand-navy">
                {disposalDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div className="text-sm text-[var(--muted)]">
                {disposalDate > new Date() ? (
                  <>
                    ({Math.ceil((disposalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days remaining)
                  </>
                ) : (
                  <span className="text-green-600 font-medium">Eligible for disposal</span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-[var(--muted)]">
              Unable to calculate - may require event date (case closure, separation, etc.)
            </div>
          )}
        </div>
      )}

      {/* DAU Reference */}
      {request.dau && (
        <div className="text-xs text-[var(--muted)] border-t border-brand-navy/10 pt-3">
          <span className="font-medium">Disposition Authority:</span> {request.dau}
        </div>
      )}
    </div>
  );
};

export default RetentionInfoPanel;
