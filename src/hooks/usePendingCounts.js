import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

const PENDING_COUNTS_CACHE_KEY = "hrms_pending_counts_supabase_cache_v2";
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes cache

const getCachedCounts = () => {
  try {
    const cached = localStorage.getItem(PENDING_COUNTS_CACHE_KEY);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL_MS) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
};

export const usePendingCounts = () => {
  const [counts, setCounts] = useState(() => getCachedCounts() || {
    openIndentsCount: 0,
    onlinePostingCount: 0,
    jobConsultancyCount: 0,
    candidateShortlistedCount: 0,
    verificationCount: 0,
    interviewSelectionCount: 0,
    joiningManagementCount: 0,
    checkSalarySlipCount: 0,
    joiningLetterCount: 0,
    inductionTrainingCount: 0,
    assetAssignmentCount: 0,
  });

  useEffect(() => {
    const fetchPendingCounts = async () => {
      try {
        const [
          { data: fmsData },
          { data: candData },
          { data: joinData }
        ] = await Promise.all([
          supabase
            .from('fms')
            .select('position_status, stage1_planned, stage1_actual, stage2_planned, stage2_actual'),
          supabase
            .from('candidate_selection')
            .select('stage1_planned, stage1_actual, stage1_status, stage2_planned, stage2_actual, stage3_planned, stage3_actual, stage4_planned, stage4_actual'),
          supabase
            .from('joining_fms')
            .select('update_link, stage1_planned, stage1_actual, stage2_planned, stage2_actual, stage3_planned, stage3_actual, stage5_planned, stage5_actual')
        ]);

        let openIndents = 0;
        let onlinePosting = 0;
        let jobConsultancy = 0;

        (fmsData || []).forEach((r) => {
          if ((r.position_status || '').toUpperCase() === 'OPEN') {
            openIndents++;
          }
          const p1 = (r.stage1_planned || '').trim();
          const a1 = (r.stage1_actual || '').trim();
          if (p1 !== '' && a1 === '' && (r.position_status || '').toUpperCase() !== 'CLOSED') {
            onlinePosting++;
          }

          const p2 = (r.stage2_planned || '').trim();
          const a2 = (r.stage2_actual || '').trim();
          if (p2 !== '' && a2 === '' && (r.position_status || '').toUpperCase() !== 'CLOSED') {
            jobConsultancy++;
          }
        });

        let candidateShortlisted = 0;
        let verification = 0;
        let interviewSelection = 0;
        let joiningManagement = 0;

        (candData || []).forEach((r) => {
          const s1 = (r.stage1_status || '').toLowerCase().trim();
          const p1 = (r.stage1_planned || '').trim();
          const a1 = (r.stage1_actual || '').trim();
          if (s1 === 'pending' || (p1 !== '' && a1 === '')) {
            candidateShortlisted++;
          }

          const p2 = (r.stage2_planned || '').trim();
          const a2 = (r.stage2_actual || '').trim();
          if (p2 !== '' && a2 === '') {
            verification++;
          }

          const p3 = (r.stage3_planned || '').trim();
          const a3 = (r.stage3_actual || '').trim();
          if (p3 !== '' && a3 === '') {
            interviewSelection++;
          }
        });

        let checkSalarySlip = 0;
        let joiningLetter = 0;
        let inductionTraining = 0;
        let assetAssignment = 0;

        (joinData || []).forEach((r) => {
          const isDone = (r.update_link || '').trim().toUpperCase() === 'DONE';
          if (!isDone) {
            joiningManagement++;
          }

          const p1 = (r.stage1_planned || '').trim();
          const a1 = (r.stage1_actual || '').trim();
          if (p1 !== '' && a1 === '') {
            checkSalarySlip++;
          }

          const p2 = (r.stage2_planned || '').trim();
          const a2 = (r.stage2_actual || '').trim();
          if (p2 !== '' && a2 === '') {
            joiningLetter++;
          }

          const p3 = (r.stage3_planned || '').trim();
          const a3 = (r.stage3_actual || '').trim();
          if (p3 !== '' && a3 === '') {
            inductionTraining++;
          }

          const p5 = (r.stage5_planned || '').trim();
          const a5 = (r.stage5_actual || '').trim();
          if (p5 !== '' && a5 === '') {
            assetAssignment++;
          }
        });

        const newCounts = {
          openIndentsCount: openIndents,
          onlinePostingCount: onlinePosting,
          jobConsultancyCount: jobConsultancy,
          candidateShortlistedCount: candidateShortlisted,
          verificationCount: verification,
          interviewSelectionCount: interviewSelection,
          joiningManagementCount: joiningManagement,
          checkSalarySlipCount: checkSalarySlip,
          joiningLetterCount: joiningLetter,
          inductionTrainingCount: inductionTraining,
          assetAssignmentCount: assetAssignment,
        };

        setCounts(newCounts);
        localStorage.setItem(
          PENDING_COUNTS_CACHE_KEY,
          JSON.stringify({ data: newCounts, timestamp: Date.now() })
        );
      } catch (err) {
        console.warn("Error fetching pending counts from Supabase:", err);
      }
    };

    fetchPendingCounts();

    const handleRefresh = () => fetchPendingCounts();
    window.addEventListener('refresh-pending-counts', handleRefresh);
    const interval = setInterval(fetchPendingCounts, 60000); // 1 minute auto refresh

    return () => {
      window.removeEventListener('refresh-pending-counts', handleRefresh);
      clearInterval(interval);
    };
  }, []);

  return counts;
};
