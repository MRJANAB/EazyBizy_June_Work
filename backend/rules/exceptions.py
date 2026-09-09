"""rules/exceptions.py — errors raised by the Rules & Rates engine."""


class MissingRuleError(RuntimeError):
    """
    Raised when a required scheme/bank rule has no configured value.

    Per the "never silently invent a rate" requirement: callers must
    surface this to the user (e.g. as a validation error) rather than
    falling back to a hardcoded number.
    """

    def __init__(self, scheme_id: str, rule_key: str, bank_name: str | None = None):
        self.scheme_id = scheme_id
        self.rule_key = rule_key
        self.bank_name = bank_name
        bank_note = f" (bank='{bank_name}')" if bank_name else ""
        super().__init__(
            f"Required rule/configuration not available: rule_key='{rule_key}' "
            f"for scheme='{scheme_id}'{bank_note}."
        )
