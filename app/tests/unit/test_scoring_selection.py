from app.models.evidence import Evidence, EvidenceCollection
from app.pipeline.cross_validation import CrossValidationService
from app.pipeline.scoring import LeadSignals, ScoringService
from app.pipeline.selection import SelectionService
from app.providers.base.business_provider import CandidateLead


def _make_score(total_score, passes_threshold, signals=None):
    return type("Score", (), {
        "total_score": total_score,
        "passes_threshold": passes_threshold,
        "signals": signals or LeadSignals(),
    })()


class TestCrossValidationService:
    def test_name_verified(self):
        evidence = EvidenceCollection()
        evidence.add(Evidence(
            field_name="company_name",
            value="Example Corp",
            source="official_website",
            confidence=0.9,
        ))
        service = CrossValidationService()
        result = service.validate(evidence, candidate_name="Example Corporation")
        assert result.name_verified is True

    def test_phone_verified(self):
        evidence = EvidenceCollection()
        evidence.add(Evidence(
            field_name="phone",
            value="+31201234567",
            source="google_places",
            confidence=0.9,
        ))
        service = CrossValidationService()
        result = service.validate(evidence, candidate_phone="+31201234567")
        assert result.phone_verified is True

    def test_email_verified(self):
        evidence = EvidenceCollection()
        evidence.add(Evidence(
            field_name="email",
            value="info@example.com",
            source="official_website",
            confidence=0.85,
        ))
        service = CrossValidationService()
        result = service.validate(evidence)
        assert result.email_verified is True

    def test_cross_source_phone(self):
        evidence = EvidenceCollection()
        evidence.add(Evidence(
            field_name="phone",
            value="+31201234567",
            source="google_places",
            confidence=0.9,
        ))
        evidence.add(Evidence(
            field_name="phone",
            value="+31201234567",
            source="official_website",
            confidence=0.85,
        ))
        service = CrossValidationService()
        result = service.validate(evidence)
        assert result.phone_verified is True

    def test_no_verification(self):
        evidence = EvidenceCollection()
        service = CrossValidationService()
        result = service.validate(evidence)
        assert result.name_verified is False
        assert result.phone_verified is False
        assert result.email_verified is False

    def test_verification_score(self):
        evidence = EvidenceCollection()
        evidence.add(Evidence(
            field_name="phone", value="+1234", source="a", confidence=0.9,
        ))
        evidence.add(Evidence(
            field_name="phone", value="+1234", source="b", confidence=0.85,
        ))
        evidence.add(Evidence(
            field_name="email", value="test@example.com",
            source="official_website", confidence=0.85,
        ))
        service = CrossValidationService()
        result = service.validate(evidence, candidate_phone="+1234")
        assert result.verification_score > 0


class TestScoringService:
    def test_fully_verified_lead_scores_100(self):
        signals = LeadSignals(
            category_match=True,
            business_active=True,
            website_identity_verified=True,
            phone_cross_verified=True,
            email_verified=True,
            location_match=True,
            recent_business_signal=True,
        )
        service = ScoringService()
        score = service.calculate_score(signals)
        assert score.total_score == 100
        assert score.passes_threshold is True

    def test_lead_below_80_is_not_returned(self):
        signals = LeadSignals(category_match=True)
        service = ScoringService()
        score = service.calculate_score(signals)
        assert score.total_score == 25
        assert score.passes_threshold is False

    def test_partial_score(self):
        signals = LeadSignals(
            category_match=True,
            business_active=True,
            website_identity_verified=True,
            location_match=True,
        )
        service = ScoringService()
        score = service.calculate_score(signals)
        assert score.total_score == 65
        assert score.passes_threshold is False

    def test_custom_minimum_score(self):
        signals = LeadSignals(category_match=True, business_active=True)
        service = ScoringService(minimum_score=40)
        score = service.calculate_score(signals)
        assert score.passes_threshold is True

    def test_category_match_scoring(self):
        signals = LeadSignals(category_match=True)
        service = ScoringService()
        score = service.calculate_score(signals)
        assert score.total_score == 25

    def test_business_active_scoring(self):
        signals = LeadSignals(business_active=True)
        service = ScoringService()
        score = service.calculate_score(signals)
        assert score.total_score == 15


class TestSelectionService:
    def test_select_top_leads(self):
        candidates = [
            (
                CandidateLead(name="Business A", source="test", business_status="active"),
                _make_score(95, True, LeadSignals(category_match=True, business_active=True)),
                EvidenceCollection(),
                "Good match",
            ),
            (
                CandidateLead(name="Business B", source="test", business_status="active"),
                _make_score(85, True, LeadSignals(category_match=True)),
                EvidenceCollection(),
                "Decent match",
            ),
            (
                CandidateLead(name="Business C", source="test", business_status="active"),
                _make_score(70, False),
                EvidenceCollection(),
                "Below threshold",
            ),
        ]
        service = SelectionService()
        result = service.select_leads(candidates, "test query")
        assert len(result.leads) == 2
        assert result.candidates_checked == 3
        assert result.qualified_leads_found == 2
        assert result.leads[0].confidence_score == 95

    def test_exclude_permanently_closed(self):
        candidates = [
            (
                CandidateLead(
                    name="Closed Biz", source="test",
                    business_status="closed_permanently",
                ),
                _make_score(95, True, LeadSignals(category_match=True)),
                EvidenceCollection(),
                "Would be good but closed",
            ),
        ]
        service = SelectionService()
        result = service.select_leads(candidates, "test")
        assert len(result.leads) == 0

    def test_max_leads_limit(self):
        candidates = [
            (
                CandidateLead(name=f"Business {i}", source="test", business_status="active"),
                _make_score(90, True, LeadSignals(category_match=True)),
                EvidenceCollection(),
                f"Match {i}",
            )
            for i in range(20)
        ]
        service = SelectionService(max_leads=5)
        result = service.select_leads(candidates, "test")
        assert len(result.leads) == 5

    def test_empty_candidates(self):
        service = SelectionService()
        result = service.select_leads([], "test")
        assert len(result.leads) == 0
        assert result.candidates_checked == 0

    def test_selection_result_model(self):
        candidates = [
            (
                CandidateLead(name="A", source="test", business_status="active"),
                _make_score(85, True, LeadSignals(category_match=True)),
                EvidenceCollection(),
                "Match",
            ),
        ]
        service = SelectionService()
        result = service.select_leads(candidates, "florist near me")
        assert result.query == "florist near me"
        assert result.requested_max_leads == 15
