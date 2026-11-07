import json
import pathlib
import tempfile
import unittest
import importlib.util

SPEC=importlib.util.spec_from_file_location("publisher",str(pathlib.Path(__file__).resolve().parents[1]/"tools"/"little_discoveries_release.py"))
mod=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(mod)

def event(i):
 return dict(id=f"T-{i}",title=f"Fictional Internal Test {i}",startDate="2026-11-14",endDate="2026-11-14",
             time="10am–11am",venue="Synthetic test venue",sourceUrl="https://example.com/fictional",
             cost="Free",ageSource="Ages 5–10",proposedAgeGroups=["School Kids (5–13)"],
             imageUrl="https://example.com/fictional.png",imageStatus="verified_original",
             imageAttribution="Synthetic test asset",imageCheckedAt="2026-11-07T12:00:00+11:00",
             imageReuseAllowed=True,sourceVerifiedAt="2026-11-07T12:00:00+11:00",
             publicStatus="unpublished",description="This event is fictional and for internal testing only")

class GateTests(unittest.TestCase):
 def setUp(self):
  self.data=dict(weekStart="2026-11-09",weekEnd="2026-11-15",candidates=[event(i) for i in range(1,8)])
  self.approval=dict(weekStart="2026-11-09",weekEnd="2026-11-15",status="approved_by_editor",editorApprovalReference="SYNTHETIC_FIXTURE_NOT_REAL_APPROVAL",
      approvedEventIds=[f"T-{i}" for i in range(1,7)],
      approvedEditorsChoiceIds=[f"T-{i}" for i in range(1,7)])
 def test_synthetic_success(self):
  errors,ready=mod.validate(self.data,self.approval)
  self.assertEqual(errors,[])
  self.assertEqual(len(ready),6)
 def test_no_approval_fails(self):
  self.approval["approvedEventIds"]=[]
  self.assertTrue(mod.validate(self.data,self.approval)[0])
 def test_six_choice_gate(self):
  self.approval["approvedEditorsChoiceIds"]=["T-1","T-2"]
  self.assertTrue(mod.validate(self.data,self.approval)[0])
 def test_unapproved_choice_fails(self):
  self.approval["approvedEditorsChoiceIds"]=["T-1","T-2","T-3","T-4","T-5","T-7"]
  self.assertTrue(mod.validate(self.data,self.approval)[0])
 def test_image_unverified_fails(self):
  self.data["candidates"][0]["imageStatus"]="not_checked"
  self.assertIn("imageStatus",str(mod.validate(self.data,self.approval)[0]))
 def test_paid_rejected(self):
  self.data["candidates"][0]["cost"]="$25"
  self.assertTrue(mod.validate(self.data,self.approval)[0])
 def test_placeholder_time_rejected(self):
  self.data["candidates"][0]["time"]="See organiser"
  self.assertTrue(mod.validate(self.data,self.approval)[0])
 def test_wrong_week_rejected(self):
  self.data["candidates"][0]["startDate"]="2026-11-22"
  self.assertTrue(mod.validate(self.data,self.approval)[0])
 def test_html_is_noindex(self):
  self.assertIn('noindex,nofollow',mod.render(self.data["candidates"][0]))
 def test_unapproved_current_50_rejected(self):
  real=pathlib.Path(__file__).resolve().parents[1]/"reviews"/"2026-11-09"/"candidates.test.json"
  if real.exists():
   candidates=json.loads(real.read_text())
   errors,_=mod.validate(candidates,self.approval)
   self.assertTrue(errors)

if __name__ == "__main__":unittest.main()
