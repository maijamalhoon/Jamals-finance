create index business_approval_policies_business_branch_idx
  on public.business_approval_policies(business_id, branch_id);
create index business_approval_requests_business_policy_idx
  on public.business_approval_requests(business_id, policy_id);
create index business_approval_requests_business_branch_idx
  on public.business_approval_requests(business_id, branch_id);
create index business_approval_decisions_business_idx
  on public.business_approval_decisions(business_id);
create index business_approval_decisions_business_request_idx
  on public.business_approval_decisions(business_id, request_id);
create index business_approval_audit_business_request_idx
  on public.business_approval_audit_log(business_id, request_id);
create index business_approval_audit_business_policy_idx
  on public.business_approval_audit_log(business_id, policy_id);
