"""
LM Studio Python SDK - Autonomous Agent Implementation
Location: D:\ClientForge\03_BOTS\elaria_command_center\python\autonomous_agent.py
Purpose: Demonstrate .act() API for autonomous multi-step tasks
"""

import lmstudio as lms
from agent_tools import *
from rich.console import Console
from rich.panel import Panel
from rich.markdown import Markdown
from rich.progress import Progress, SpinnerColumn, TextColumn
import json
from typing import List, Callable

console = Console()

# ============================================================
# AGENT CONFIGURATION
# ============================================================

class CRMAgent:
    """
    Autonomous CRM agent using LM Studio's .act() API.

    The agent can:
    - Search contacts and deals
    - Analyze data and identify trends
    - Generate reports
    - Make recommendations
    - Execute multi-step workflows autonomously
    """

    def __init__(self, model_name: str = "qwen3-30b-a3b"):
        """Initialize the CRM agent with a model."""
        self.model = lms.llm(model_name)
        self.console = Console()

    def _on_message(self, message: str):
        """Callback for agent messages."""
        self.console.print(Panel(
            Markdown(message),
            title="[bold cyan]Agent Thinking[/bold cyan]",
            border_style="cyan"
        ))

    def _on_tool_call(self, tool_name: str, args: dict):
        """Callback for tool calls."""
        self.console.print(
            f"[yellow]🔧 Tool Call:[/yellow] {tool_name}({', '.join(f'{k}={v}' for k, v in args.items())})"
        )

    def act(
        self,
        task: str,
        tools: List[Callable],
        verbose: bool = True
    ):
        """
        Execute autonomous task with tools.

        Args:
            task: Natural language task description
            tools: List of tool functions
            verbose: Show agent thinking and tool calls

        Returns:
            Agent's final response
        """
        self.console.print(Panel(
            f"[bold white]{task}[/bold white]",
            title="[bold green]Task[/bold green]",
            border_style="green"
        ))

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=self.console
        ) as progress:
            task_id = progress.add_task("[cyan]Agent working...", total=None)

            result = self.model.act(
                task,
                tools,
                on_message=self._on_message if verbose else None,
            )

            progress.stop()

        self.console.print(Panel(
            Markdown(str(result)),
            title="[bold green]Result[/bold green]",
            border_style="green"
        ))

        return result


# ============================================================
# PRE-CONFIGURED AGENT WORKFLOWS
# ============================================================

def sales_intelligence_agent():
    """
    Autonomous agent for sales intelligence and forecasting.
    """
    agent = CRMAgent()

    task = """
    Analyze our sales pipeline and provide a comprehensive intelligence report:

    1. Calculate the 30-day deal forecast
    2. Identify any at-risk deals that need attention
    3. Find the top 5 highest-value deals in negotiation stage
    4. Create a sales intelligence report with:
       - Executive summary
       - Forecast breakdown
       - At-risk deals with recommended actions
       - Top opportunities to focus on
    5. Save the report as 'sales_intelligence_report.md'
    """

    tools = [
        calculate_deal_forecast,
        identify_at_risk_deals,
        search_deals,
        create_report,
    ]

    return agent.act(task, tools)


def contact_enrichment_agent():
    """
    Autonomous agent for contact research and enrichment.
    """
    agent = CRMAgent()

    task = """
    Find and analyze all contacts from companies in the software industry:

    1. Search for contacts with company names containing 'Tech', 'Software', or 'Cloud'
    2. For each contact found, get their analytics
    3. Identify the most engaged contacts (based on activity)
    4. Create a contact enrichment report with:
       - Total contacts found
       - Engagement scores
       - Top 10 most valuable contacts
       - Recommended next actions for each
    5. Save as 'contact_enrichment_report.md'
    """

    tools = [
        search_contacts,
        get_contact_analytics,
        create_report,
    ]

    return agent.act(task, tools)


def deal_health_monitor_agent():
    """
    Autonomous agent for monitoring deal health and sending alerts.
    """
    agent = CRMAgent()

    task = """
    Monitor deal health and send appropriate notifications:

    1. Identify all at-risk deals
    2. For each at-risk deal:
       - Assess the severity (high risk if value > $50k or inactive > 14 days)
       - Send a high-priority notification for high-risk deals
       - Send a normal notification for moderate-risk deals
    3. Create a deal health dashboard report with:
       - Total deals monitored
       - At-risk deal breakdown
       - Recommended recovery actions
       - Next review date
    4. Save as 'deal_health_monitor.md'
    """

    tools = [
        identify_at_risk_deals,
        send_notification,
        create_report,
    ]

    return agent.act(task, tools)


def quarterly_business_review_agent():
    """
    Autonomous agent for generating quarterly business reviews.
    """
    agent = CRMAgent()

    task = """
    Generate a comprehensive Quarterly Business Review (QBR):

    1. Calculate 90-day deal forecast
    2. Find all customers (status = 'customer')
    3. Identify at-risk deals
    4. Search for all closed-won deals in the last 90 days
    5. Create a QBR report with:
       - Executive Summary
       - Revenue Forecast (90 days)
       - Customer Health Score
       - Deal Pipeline Analysis
       - Risk Assessment
       - Key Wins (closed deals)
       - Strategic Recommendations for next quarter
       - Action Items
    6. Save as 'Q1_2025_Business_Review.md'
    """

    tools = [
        calculate_deal_forecast,
        search_contacts,
        identify_at_risk_deals,
        search_deals,
        create_report,
    ]

    return agent.act(task, tools)


def smart_search_agent(user_query: str):
    """
    Autonomous agent for intelligent CRM search.

    Args:
        user_query: Natural language search query
    """
    agent = CRMAgent()

    task = f"""
    The user asked: "{user_query}"

    Using the available tools, help answer their question by:

    1. Understanding what they're looking for
    2. Searching the appropriate data (contacts, deals, analytics)
    3. Analyzing the results
    4. Providing a clear, actionable answer
    5. If relevant, suggest next steps or create a report
    """

    tools = ALL_TOOLS  # Give agent access to all tools

    return agent.act(task, tools)


# ============================================================
# INTERACTIVE AGENT CLI
# ============================================================

def interactive_agent():
    """
    Interactive CLI for autonomous agent.
    """
    console.print(Panel(
        "[bold cyan]ClientForge CRM Autonomous Agent[/bold cyan]\n"
        "Powered by LM Studio Python SDK (.act() API)\n\n"
        "Available commands:\n"
        "  [green]sales[/green] - Run sales intelligence agent\n"
        "  [green]contacts[/green] - Run contact enrichment agent\n"
        "  [green]health[/green] - Run deal health monitor\n"
        "  [green]qbr[/green] - Generate quarterly business review\n"
        "  [green]search <query>[/green] - Smart search\n"
        "  [green]custom <task>[/green] - Custom autonomous task\n"
        "  [green]quit[/green] - Exit\n",
        title="[bold green]CRM Agent[/bold green]",
        border_style="green"
    ))

    agent = CRMAgent()

    while True:
        console.print()
        user_input = console.input("[bold yellow]Agent>[/bold yellow] ").strip()

        if not user_input:
            continue

        if user_input.lower() == "quit":
            console.print("[cyan]Goodbye![/cyan]")
            break

        elif user_input.lower() == "sales":
            sales_intelligence_agent()

        elif user_input.lower() == "contacts":
            contact_enrichment_agent()

        elif user_input.lower() == "health":
            deal_health_monitor_agent()

        elif user_input.lower() == "qbr":
            quarterly_business_review_agent()

        elif user_input.lower().startswith("search "):
            query = user_input[7:].strip()
            smart_search_agent(query)

        elif user_input.lower().startswith("custom "):
            task = user_input[7:].strip()
            agent.act(task, ALL_TOOLS)

        else:
            # Treat as smart search by default
            smart_search_agent(user_input)


# ============================================================
# EXAMPLE USAGE
# ============================================================

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        command = sys.argv[1].lower()

        if command == "sales":
            sales_intelligence_agent()
        elif command == "contacts":
            contact_enrichment_agent()
        elif command == "health":
            deal_health_monitor_agent()
        elif command == "qbr":
            quarterly_business_review_agent()
        elif command == "interactive":
            interactive_agent()
        else:
            console.print(f"[red]Unknown command: {command}[/red]")
            console.print("Available: sales, contacts, health, qbr, interactive")
    else:
        # Default: run interactive mode
        interactive_agent()
