-- Financial Project Management Schema Migration
-- This migration creates all tables for the financial project management system
-- ============================================
-- DEPENDENCIES: app_role type and has_role function
-- (Required for RLS policies; creates if not exists from prior migrations)
-- ============================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'app_role'
) THEN CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'credit_analyst', 'consultant');
END IF;
END $$;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public AS $$ BEGIN IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_name = 'user_roles'
    ) THEN RETURN false;
END IF;
RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
        AND role = _role
);
END $$;
-- ============================================
-- PROJECT
-- ============================================
CREATE TABLE public.project (
    project_id BIGSERIAL PRIMARY KEY,
    project_name VARCHAR(255) NOT NULL,
    industry VARCHAR(50),
    capacity_mw INT,
    location VARCHAR(100),
    currency CHAR(3) DEFAULT 'USD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- ============================================
-- FINANCIAL PERIOD
-- ============================================
CREATE TABLE public.financial_period (
    period_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES public.project(project_id) ON DELETE CASCADE,
    year INT NOT NULL,
    period_type VARCHAR(20) NOT NULL,
    -- e.g., 'annual', 'quarterly', 'monthly'
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_period_dates CHECK (end_date > start_date)
);
-- ============================================
-- SCENARIO
-- ============================================
CREATE TABLE public.scenario (
    scenario_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES public.project(project_id) ON DELETE CASCADE,
    scenario_code VARCHAR(20) NOT NULL,
    value DECIMAL(10, 2),
    description TEXT,
    is_base BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_scenario_code_per_project UNIQUE (project_id, scenario_code)
);
-- ============================================
-- ESTIMATION MASTER
-- ============================================
CREATE TABLE public.estimation_master (
    estimation_id BIGSERIAL PRIMARY KEY,
    estimation_key VARCHAR(100) NOT NULL UNIQUE,
    unit VARCHAR(20),
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- ============================================
-- ESTIMATION VALUE
-- ============================================
CREATE TABLE public.estimation_value (
    estimation_value_id BIGSERIAL PRIMARY KEY,
    estimation_id BIGINT NOT NULL REFERENCES public.estimation_master(estimation_id) ON DELETE CASCADE,
    scenario_id BIGINT NOT NULL REFERENCES public.scenario(scenario_id) ON DELETE CASCADE,
    period_id BIGINT NOT NULL REFERENCES public.financial_period(period_id) ON DELETE CASCADE,
    value DECIMAL(18, 6) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_estimation_scenario_period UNIQUE (estimation_id, scenario_id, period_id)
);
-- ============================================
-- CAPEX CATEGORY
-- ============================================
CREATE TABLE public.capex_category (
    capex_category_id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- ============================================
-- CAPEX ITEM
-- ============================================
CREATE TABLE public.capex_item (
    capex_item_id BIGSERIAL PRIMARY KEY,
    capex_category_id BIGINT NOT NULL REFERENCES public.capex_category(capex_category_id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- ============================================
-- CAPEX DETAILS
-- ============================================
CREATE TABLE public.capex_details (
    capex_detail_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES public.project(project_id) ON DELETE CASCADE,
    scenario_id BIGINT NOT NULL REFERENCES public.scenario(scenario_id) ON DELETE CASCADE,
    capex_item_id BIGINT NOT NULL REFERENCES public.capex_item(capex_item_id) ON DELETE CASCADE,
    amount DECIMAL(18, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_capex_per_project_scenario_item UNIQUE (project_id, scenario_id, capex_item_id)
);
-- ============================================
-- P/L LINE ITEM
-- ============================================
CREATE TABLE public.pl_line_item (
    pl_item_id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- ============================================
-- P/L DETAILS
-- ============================================
CREATE TABLE public.pl_details (
    pl_detail_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES public.project(project_id) ON DELETE CASCADE,
    scenario_id BIGINT NOT NULL REFERENCES public.scenario(scenario_id) ON DELETE CASCADE,
    period_id BIGINT NOT NULL REFERENCES public.financial_period(period_id) ON DELETE CASCADE,
    pl_item_id BIGINT NOT NULL REFERENCES public.pl_line_item(pl_item_id) ON DELETE CASCADE,
    amount DECIMAL(18, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_pl_per_project_scenario_period_item UNIQUE (project_id, scenario_id, period_id, pl_item_id)
);
-- ============================================
-- BS CATEGORY
-- ============================================
CREATE TABLE public.bs_category (
    bs_category_id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- ============================================
-- BS LINE ITEM
-- ============================================
CREATE TABLE public.bs_line_item (
    bs_item_id BIGSERIAL PRIMARY KEY,
    bs_category_id BIGINT NOT NULL REFERENCES public.bs_category(bs_category_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- ============================================
-- BS DETAILS
-- ============================================
CREATE TABLE public.bs_details (
    bs_detail_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES public.project(project_id) ON DELETE CASCADE,
    scenario_id BIGINT NOT NULL REFERENCES public.scenario(scenario_id) ON DELETE CASCADE,
    period_id BIGINT NOT NULL REFERENCES public.financial_period(period_id) ON DELETE CASCADE,
    bs_item_id BIGINT NOT NULL REFERENCES public.bs_line_item(bs_item_id) ON DELETE CASCADE,
    amount DECIMAL(18, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_bs_per_project_scenario_period_item UNIQUE (project_id, scenario_id, period_id, bs_item_id)
);
-- ============================================
-- LOAN DETAILS
-- ============================================
CREATE TABLE public.loan_details (
    loan_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES public.project(project_id) ON DELETE CASCADE,
    lender_name VARCHAR(100) NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL,
    tenure_years INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- ============================================
-- LOAN SCHEDULE
-- ============================================
CREATE TABLE public.loan_schedule (
    loan_schedule_id BIGSERIAL PRIMARY KEY,
    loan_id BIGINT NOT NULL REFERENCES public.loan_details(loan_id) ON DELETE CASCADE,
    period_id BIGINT NOT NULL REFERENCES public.financial_period(period_id) ON DELETE CASCADE,
    principal DECIMAL(18, 2) NOT NULL DEFAULT 0,
    interest DECIMAL(18, 2) NOT NULL DEFAULT 0,
    closing_balance DECIMAL(18, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_loan_schedule_per_loan_period UNIQUE (loan_id, period_id)
);
-- ============================================
-- CASHFLOW DETAILS
-- ============================================
CREATE TABLE public.cashflow_details (
    cashflow_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES public.project(project_id) ON DELETE CASCADE,
    scenario_id BIGINT NOT NULL REFERENCES public.scenario(scenario_id) ON DELETE CASCADE,
    period_id BIGINT NOT NULL REFERENCES public.financial_period(period_id) ON DELETE CASCADE,
    operating_cf DECIMAL(18, 2) NOT NULL DEFAULT 0,
    investing_cf DECIMAL(18, 2) NOT NULL DEFAULT 0,
    financing_cf DECIMAL(18, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_cashflow_per_project_scenario_period UNIQUE (project_id, scenario_id, period_id)
);
-- ============================================
-- DSCR DETAILS
-- ============================================
CREATE TABLE public.dscr_details (
    dscr_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES public.project(project_id) ON DELETE CASCADE,
    scenario_id BIGINT NOT NULL REFERENCES public.scenario(scenario_id) ON DELETE CASCADE,
    period_id BIGINT NOT NULL REFERENCES public.financial_period(period_id) ON DELETE CASCADE,
    dscr DECIMAL(8, 3) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_dscr_per_project_scenario_period UNIQUE (project_id, scenario_id, period_id)
);
-- ============================================
-- PROJECT METRIC
-- ============================================
CREATE TABLE public.project_metric (
    metric_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES public.project(project_id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,
    -- e.g., 'NPV', 'IRR', 'Payback Period'
    scenario_id BIGINT REFERENCES public.scenario(scenario_id) ON DELETE CASCADE,
    value DECIMAL(18, 6) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_metric_per_project_type_scenario UNIQUE (project_id, metric_type, scenario_id)
);
-- ============================================
-- SENSITIVITY PARAMETER
-- ============================================
CREATE TABLE public.sensitivity_parameter (
    param_id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- ============================================
-- SENSITIVITY CALC
-- ============================================
CREATE TABLE public.sensitivity_calc (
    calc_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES public.project(project_id) ON DELETE CASCADE,
    param_id BIGINT NOT NULL REFERENCES public.sensitivity_parameter(param_id) ON DELETE CASCADE,
    change_percent DECIMAL(6, 2) NOT NULL,
    resulting_irr DECIMAL(8, 3) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_sensitivity_per_project_param_change UNIQUE (project_id, param_id, change_percent)
);
-- ============================================
-- USER DETAILS
-- ============================================
CREATE TABLE public.user_details (
    user_id BIGSERIAL PRIMARY KEY,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    user_firstname VARCHAR(100) NOT NULL,
    user_lastname VARCHAR(100) NOT NULL,
    user_phone VARCHAR(20),
    user_email VARCHAR(100) NOT NULL UNIQUE,
    user_company VARCHAR(100),
    user_city VARCHAR(50),
    user_state VARCHAR(50),
    user_country VARCHAR(50),
    user_pincode VARCHAR(10),
    user_role_type VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Index for faster lookups
CREATE INDEX idx_user_details_auth_user_id ON public.user_details(auth_user_id);
CREATE INDEX idx_user_details_email ON public.user_details(user_email);
-- ============================================
-- PROJECT USER MAP
-- ============================================
CREATE TABLE public.project_user_map (
    project_user_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES public.project(project_id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES public.user_details(user_id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL,
    -- e.g., 'owner', 'viewer', 'editor'
    ownership_percent DECIMAL(5, 2) DEFAULT 0 CHECK (
        ownership_percent >= 0
        AND ownership_percent <= 100
    ),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_project_user_relationship UNIQUE (project_id, user_id)
);
-- ============================================
-- INDEXES for Performance
-- ============================================
CREATE INDEX idx_financial_period_project_id ON public.financial_period(project_id);
CREATE INDEX idx_financial_period_year ON public.financial_period(year);
CREATE INDEX idx_scenario_project_id ON public.scenario(project_id);
CREATE INDEX idx_estimation_value_scenario_id ON public.estimation_value(scenario_id);
CREATE INDEX idx_estimation_value_period_id ON public.estimation_value(period_id);
CREATE INDEX idx_capex_details_project_id ON public.capex_details(project_id);
CREATE INDEX idx_capex_details_scenario_id ON public.capex_details(scenario_id);
CREATE INDEX idx_pl_details_project_id ON public.pl_details(project_id);
CREATE INDEX idx_pl_details_scenario_id ON public.pl_details(scenario_id);
CREATE INDEX idx_pl_details_period_id ON public.pl_details(period_id);
CREATE INDEX idx_bs_details_project_id ON public.bs_details(project_id);
CREATE INDEX idx_bs_details_scenario_id ON public.bs_details(scenario_id);
CREATE INDEX idx_bs_details_period_id ON public.bs_details(period_id);
CREATE INDEX idx_loan_details_project_id ON public.loan_details(project_id);
CREATE INDEX idx_loan_schedule_loan_id ON public.loan_schedule(loan_id);
CREATE INDEX idx_loan_schedule_period_id ON public.loan_schedule(period_id);
CREATE INDEX idx_cashflow_details_project_id ON public.cashflow_details(project_id);
CREATE INDEX idx_cashflow_details_scenario_id ON public.cashflow_details(scenario_id);
CREATE INDEX idx_dscr_details_project_id ON public.dscr_details(project_id);
CREATE INDEX idx_dscr_details_scenario_id ON public.dscr_details(scenario_id);
CREATE INDEX idx_project_metric_project_id ON public.project_metric(project_id);
CREATE INDEX idx_sensitivity_calc_project_id ON public.sensitivity_calc(project_id);
CREATE INDEX idx_project_user_map_project_id ON public.project_user_map(project_id);
CREATE INDEX idx_project_user_map_user_id ON public.project_user_map(user_id);
-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS on all tables
ALTER TABLE public.project ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_period ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimation_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimation_value ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capex_category ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capex_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capex_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pl_line_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pl_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bs_category ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bs_line_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bs_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashflow_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dscr_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_metric ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensitivity_parameter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensitivity_calc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_user_map ENABLE ROW LEVEL SECURITY;
-- ============================================
-- RLS POLICIES
-- ============================================
-- Project policies: Users can view projects they're associated with, admins can view all
CREATE POLICY "Users can view associated projects" ON public.project FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.project_user_map
            WHERE project_user_map.project_id = project.project_id
                AND project_user_map.user_id IN (
                    SELECT user_id
                    FROM public.user_details
                    WHERE auth_user_id = auth.uid()
                )
        )
        OR has_role(auth.uid(), 'admin'::app_role)
    );
CREATE POLICY "Users can create projects" ON public.project FOR
INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update associated projects" ON public.project FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM public.project_user_map
            WHERE project_user_map.project_id = project.project_id
                AND project_user_map.user_id IN (
                    SELECT user_id
                    FROM public.user_details
                    WHERE auth_user_id = auth.uid()
                )
                AND project_user_map.relationship_type IN ('owner', 'editor')
        )
        OR has_role(auth.uid(), 'admin'::app_role)
    );
-- Financial Period policies
CREATE POLICY "Users can view periods for associated projects" ON public.financial_period FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.project_user_map
            WHERE project_user_map.project_id = financial_period.project_id
                AND project_user_map.user_id IN (
                    SELECT user_id
                    FROM public.user_details
                    WHERE auth_user_id = auth.uid()
                )
        )
        OR has_role(auth.uid(), 'admin'::app_role)
    );
CREATE POLICY "Users can manage periods for associated projects" ON public.financial_period FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM public.project_user_map
        WHERE project_user_map.project_id = financial_period.project_id
            AND project_user_map.user_id IN (
                SELECT user_id
                FROM public.user_details
                WHERE auth_user_id = auth.uid()
            )
            AND project_user_map.relationship_type IN ('owner', 'editor')
    )
    OR has_role(auth.uid(), 'admin'::app_role)
);
-- Scenario policies
CREATE POLICY "Users can view scenarios for associated projects" ON public.scenario FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.project_user_map
            WHERE project_user_map.project_id = scenario.project_id
                AND project_user_map.user_id IN (
                    SELECT user_id
                    FROM public.user_details
                    WHERE auth_user_id = auth.uid()
                )
        )
        OR has_role(auth.uid(), 'admin'::app_role)
    );
CREATE POLICY "Users can manage scenarios for associated projects" ON public.scenario FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM public.project_user_map
        WHERE project_user_map.project_id = scenario.project_id
            AND project_user_map.user_id IN (
                SELECT user_id
                FROM public.user_details
                WHERE auth_user_id = auth.uid()
            )
            AND project_user_map.relationship_type IN ('owner', 'editor')
    )
    OR has_role(auth.uid(), 'admin'::app_role)
);
-- Estimation Master: Public read for authenticated users
CREATE POLICY "Authenticated users can view estimation master" ON public.estimation_master FOR
SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage estimation master" ON public.estimation_master FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
-- Estimation Value policies
CREATE POLICY "Users can view estimation values for associated projects" ON public.estimation_value FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.scenario s
                JOIN public.project_user_map pum ON s.project_id = pum.project_id
            WHERE s.scenario_id = estimation_value.scenario_id
                AND pum.user_id IN (
                    SELECT user_id
                    FROM public.user_details
                    WHERE auth_user_id = auth.uid()
                )
        )
        OR has_role(auth.uid(), 'admin'::app_role)
    );
CREATE POLICY "Users can manage estimation values for associated projects" ON public.estimation_value FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM public.scenario s
            JOIN public.project_user_map pum ON s.project_id = pum.project_id
        WHERE s.scenario_id = estimation_value.scenario_id
            AND pum.user_id IN (
                SELECT user_id
                FROM public.user_details
                WHERE auth_user_id = auth.uid()
            )
            AND pum.relationship_type IN ('owner', 'editor')
    )
    OR has_role(auth.uid(), 'admin'::app_role)
);
-- CAPEX Category: Public read
CREATE POLICY "Authenticated users can view capex categories" ON public.capex_category FOR
SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage capex categories" ON public.capex_category FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
-- CAPEX Item: Public read
CREATE POLICY "Authenticated users can view capex items" ON public.capex_item FOR
SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage capex items" ON public.capex_item FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
-- CAPEX Details policies
CREATE POLICY "Users can view capex details for associated projects" ON public.capex_details FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.project_user_map
            WHERE project_user_map.project_id = capex_details.project_id
                AND project_user_map.user_id IN (
                    SELECT user_id
                    FROM public.user_details
                    WHERE auth_user_id = auth.uid()
                )
        )
        OR has_role(auth.uid(), 'admin'::app_role)
    );
CREATE POLICY "Users can manage capex details for associated projects" ON public.capex_details FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM public.project_user_map
        WHERE project_user_map.project_id = capex_details.project_id
            AND project_user_map.user_id IN (
                SELECT user_id
                FROM public.user_details
                WHERE auth_user_id = auth.uid()
            )
            AND project_user_map.relationship_type IN ('owner', 'editor')
    )
    OR has_role(auth.uid(), 'admin'::app_role)
);
-- P/L Line Item: Public read
CREATE POLICY "Authenticated users can view P/L line items" ON public.pl_line_item FOR
SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage P/L line items" ON public.pl_line_item FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
-- P/L Details policies
CREATE POLICY "Users can view P/L details for associated projects" ON public.pl_details FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.project_user_map
            WHERE project_user_map.project_id = pl_details.project_id
                AND project_user_map.user_id IN (
                    SELECT user_id
                    FROM public.user_details
                    WHERE auth_user_id = auth.uid()
                )
        )
        OR has_role(auth.uid(), 'admin'::app_role)
    );
CREATE POLICY "Users can manage P/L details for associated projects" ON public.pl_details FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM public.project_user_map
        WHERE project_user_map.project_id = pl_details.project_id
            AND project_user_map.user_id IN (
                SELECT user_id
                FROM public.user_details
                WHERE auth_user_id = auth.uid()
            )
            AND project_user_map.relationship_type IN ('owner', 'editor')
    )
    OR has_role(auth.uid(), 'admin'::app_role)
);
-- BS Category: Public read
CREATE POLICY "Authenticated users can view BS categories" ON public.bs_category FOR
SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage BS categories" ON public.bs_category FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
-- BS Line Item: Public read
CREATE POLICY "Authenticated users can view BS line items" ON public.bs_line_item FOR
SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage BS line items" ON public.bs_line_item FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
-- BS Details policies
CREATE POLICY "Users can view BS details for associated projects" ON public.bs_details FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.project_user_map
            WHERE project_user_map.project_id = bs_details.project_id
                AND project_user_map.user_id IN (
                    SELECT user_id
                    FROM public.user_details
                    WHERE auth_user_id = auth.uid()
                )
        )
        OR has_role(auth.uid(), 'admin'::app_role)
    );
CREATE POLICY "Users can manage BS details for associated projects" ON public.bs_details FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM public.project_user_map
        WHERE project_user_map.project_id = bs_details.project_id
            AND project_user_map.user_id IN (
                SELECT user_id
                FROM public.user_details
                WHERE auth_user_id = auth.uid()
            )
            AND project_user_map.relationship_type IN ('owner', 'editor')
    )
    OR has_role(auth.uid(), 'admin'::app_role)
);
-- Loan Details policies
CREATE POLICY "Users can view loan details for associated projects" ON public.loan_details FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.project_user_map
            WHERE project_user_map.project_id = loan_details.project_id
                AND project_user_map.user_id IN (
                    SELECT user_id
                    FROM public.user_details
                    WHERE auth_user_id = auth.uid()
                )
        )
        OR has_role(auth.uid(), 'admin'::app_role)
    );
CREATE POLICY "Users can manage loan details for associated projects" ON public.loan_details FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM public.project_user_map
        WHERE project_user_map.project_id = loan_details.project_id
            AND project_user_map.user_id IN (
                SELECT user_id
                FROM public.user_details
                WHERE auth_user_id = auth.uid()
            )
            AND project_user_map.relationship_type IN ('owner', 'editor')
    )
    OR has_role(auth.uid(), 'admin'::app_role)
);
-- Loan Schedule policies
CREATE POLICY "Users can view loan schedules for associated projects" ON public.loan_schedule FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.loan_details ld
                JOIN public.project_user_map pum ON ld.project_id = pum.project_id
            WHERE ld.loan_id = loan_schedule.loan_id
                AND pum.user_id IN (
                    SELECT user_id
                    FROM public.user_details
                    WHERE auth_user_id = auth.uid()
                )
        )
        OR has_role(auth.uid(), 'admin'::app_role)
    );
CREATE POLICY "Users can manage loan schedules for associated projects" ON public.loan_schedule FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM public.loan_details ld
            JOIN public.project_user_map pum ON ld.project_id = pum.project_id
        WHERE ld.loan_id = loan_schedule.loan_id
            AND pum.user_id IN (
                SELECT user_id
                FROM public.user_details
                WHERE auth_user_id = auth.uid()
            )
            AND pum.relationship_type IN ('owner', 'editor')
    )
    OR has_role(auth.uid(), 'admin'::app_role)
);
-- Cashflow Details policies
CREATE POLICY "Users can view cashflow details for associated projects" ON public.cashflow_details FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.project_user_map
            WHERE project_user_map.project_id = cashflow_details.project_id
                AND project_user_map.user_id IN (
                    SELECT user_id
                    FROM public.user_details
                    WHERE auth_user_id = auth.uid()
                )
        )
        OR has_role(auth.uid(), 'admin'::app_role)
    );
CREATE POLICY "Users can manage cashflow details for associated projects" ON public.cashflow_details FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM public.project_user_map
        WHERE project_user_map.project_id = cashflow_details.project_id
            AND project_user_map.user_id IN (
                SELECT user_id
                FROM public.user_details
                WHERE auth_user_id = auth.uid()
            )
            AND project_user_map.relationship_type IN ('owner', 'editor')
    )
    OR has_role(auth.uid(), 'admin'::app_role)
);
-- DSCR Details policies
CREATE POLICY "Users can view DSCR details for associated projects" ON public.dscr_details FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.project_user_map
            WHERE project_user_map.project_id = dscr_details.project_id
                AND project_user_map.user_id IN (
                    SELECT user_id
                    FROM public.user_details
                    WHERE auth_user_id = auth.uid()
                )
        )
        OR has_role(auth.uid(), 'admin'::app_role)
    );
CREATE POLICY "Users can manage DSCR details for associated projects" ON public.dscr_details FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM public.project_user_map
        WHERE project_user_map.project_id = dscr_details.project_id
            AND project_user_map.user_id IN (
                SELECT user_id
                FROM public.user_details
                WHERE auth_user_id = auth.uid()
            )
            AND project_user_map.relationship_type IN ('owner', 'editor')
    )
    OR has_role(auth.uid(), 'admin'::app_role)
);
-- Project Metric policies
CREATE POLICY "Users can view project metrics for associated projects" ON public.project_metric FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.project_user_map
            WHERE project_user_map.project_id = project_metric.project_id
                AND project_user_map.user_id IN (
                    SELECT user_id
                    FROM public.user_details
                    WHERE auth_user_id = auth.uid()
                )
        )
        OR has_role(auth.uid(), 'admin'::app_role)
    );
CREATE POLICY "Users can manage project metrics for associated projects" ON public.project_metric FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM public.project_user_map
        WHERE project_user_map.project_id = project_metric.project_id
            AND project_user_map.user_id IN (
                SELECT user_id
                FROM public.user_details
                WHERE auth_user_id = auth.uid()
            )
            AND project_user_map.relationship_type IN ('owner', 'editor')
    )
    OR has_role(auth.uid(), 'admin'::app_role)
);
-- Sensitivity Parameter: Public read
CREATE POLICY "Authenticated users can view sensitivity parameters" ON public.sensitivity_parameter FOR
SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage sensitivity parameters" ON public.sensitivity_parameter FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
-- Sensitivity Calc policies
CREATE POLICY "Users can view sensitivity calculations for associated projects" ON public.sensitivity_calc FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.project_user_map
            WHERE project_user_map.project_id = sensitivity_calc.project_id
                AND project_user_map.user_id IN (
                    SELECT user_id
                    FROM public.user_details
                    WHERE auth_user_id = auth.uid()
                )
        )
        OR has_role(auth.uid(), 'admin'::app_role)
    );
CREATE POLICY "Users can manage sensitivity calculations for associated projects" ON public.sensitivity_calc FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM public.project_user_map
        WHERE project_user_map.project_id = sensitivity_calc.project_id
            AND project_user_map.user_id IN (
                SELECT user_id
                FROM public.user_details
                WHERE auth_user_id = auth.uid()
            )
            AND project_user_map.relationship_type IN ('owner', 'editor')
    )
    OR has_role(auth.uid(), 'admin'::app_role)
);
-- User Details policies
CREATE POLICY "Users can view own user details" ON public.user_details FOR
SELECT USING (
        auth_user_id = auth.uid()
        OR has_role(auth.uid(), 'admin'::app_role)
    );
CREATE POLICY "Users can update own user details" ON public.user_details FOR
UPDATE USING (
        auth_user_id = auth.uid()
        OR has_role(auth.uid(), 'admin'::app_role)
    );
CREATE POLICY "Users can insert own user details" ON public.user_details FOR
INSERT WITH CHECK (
        auth_user_id = auth.uid()
        OR has_role(auth.uid(), 'admin'::app_role)
    );
-- Project User Map policies
CREATE POLICY "Users can view project user maps for associated projects" ON public.project_user_map FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.project_user_map pum2
            WHERE pum2.project_id = project_user_map.project_id
                AND pum2.user_id IN (
                    SELECT user_id
                    FROM public.user_details
                    WHERE auth_user_id = auth.uid()
                )
        )
        OR has_role(auth.uid(), 'admin'::app_role)
    );
CREATE POLICY "Project owners can manage project user maps" ON public.project_user_map FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM public.project_user_map pum2
        WHERE pum2.project_id = project_user_map.project_id
            AND pum2.user_id IN (
                SELECT user_id
                FROM public.user_details
                WHERE auth_user_id = auth.uid()
            )
            AND pum2.relationship_type = 'owner'
            AND pum2.is_primary = true
    )
    OR has_role(auth.uid(), 'admin'::app_role)
);
-- ============================================
-- TRIGGERS for updated_at
-- ============================================
-- Check if update_updated_at_column function exists, create if not
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Add triggers for tables with updated_at columns
CREATE TRIGGER update_loan_details_updated_at BEFORE
UPDATE ON public.loan_details FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_details_updated_at BEFORE
UPDATE ON public.user_details FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();