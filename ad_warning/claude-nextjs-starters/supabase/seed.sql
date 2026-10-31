-- R1~R8 기본 규칙 시드 (값 기준: src/lib/detection/rules.config.ts, docs/detection-rules.md)
-- R7·R8은 stage=2, 비활성. 재실행해도 기존 사용자 설정을 덮어쓰지 않는다.
insert into detection_rules (rule_code, type, severity, threshold, target_type, is_active, stage) values
  ('R1', '비용 급증', 'high', '{"costChangeRate": 0.5}', null, true, 1),
  ('R2', '노출 급감', 'high', '{"impressionChangeRate": -0.6}', null, true, 1),
  ('R3', 'CTR 급락', 'medium', '{"ctrChangeRate": -0.3, "minBaselineImpressions": 3000}', null, true, 1),
  ('R4', '전환 0', 'critical', '{"minSpend": 100000, "minBaselineConversions": 1}', null, true, 1),
  ('R5', 'CPA/ROAS 이탈', 'medium', '{"cpaIncreaseRate": 0.3, "roasRatio": 0.7}', null, true, 1),
  ('R6', '클릭 급증', 'high', '{"clickChangeRate": 2.0, "conversionChangeRate": 0.2}', null, true, 1),
  ('R7', '예산 조기 소진', 'high', '{}', null, false, 2),
  ('R8', '비즈머니 부족', 'critical', '{}', null, false, 2)
on conflict (rule_code) do nothing;
