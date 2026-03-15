#!/usr/bin/env python3
"""
Generate platform-specific social media copy for AI in ASIA articles.

This script takes article metadata and outputs copy files for each platform
(Facebook, LinkedIn, Twitter/X, Instagram, TikTok) following exact templates.

Usage:
    python generate_copy.py \
      --article-metadata '{"title":"...","slug":"..."}' \
      --output-dir ./social-outputs/SLUG/
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional


def extract_hero_stat(bullet: str) -> Optional[str]:
    """
    Extract numeric hero stat from a bullet point.
    Finds the first number or percentage pattern in the text.

    Args:
        bullet: The bullet text to search for statistics

    Returns:
        The extracted hero stat string, or None if no stat found
    """
    # Match patterns like "80%", "2.5x", "150 million", "$50B", etc.
    match = re.search(r'(\d+(?:[.,]\d+)?(?:\s*[%xX]|(?:\s+(?:billion|million|trillion|B|M|T))?)?)', bullet)
    if match:
        return match.group(1).strip()
    return None


def extract_first_sentences(excerpt: str, num_sentences: int = 2) -> str:
    """
    Extract the first N sentences from the excerpt.

    Args:
        excerpt: The full excerpt text
        num_sentences: Number of sentences to extract (default: 2)

    Returns:
        First N sentences joined together
    """
    # Split on '. ' but keep the period with the sentence
    sentences = re.split(r'(?<=[.!?])\s+', excerpt.strip())

    # Take first N sentences
    result_sentences = []
    for i, sentence in enumerate(sentences[:num_sentences]):
        if i < num_sentences:
            result_sentences.append(sentence.strip())

    return ' '.join(result_sentences)


def build_article_url(metadata: Dict) -> str:
    """Build the full article URL using /{category}/{slug} pattern."""
    category = metadata.get('category', 'news').lower()
    slug = metadata.get('slug', '')
    return f"https://aiinasia.com/{category}/{slug}"


def format_tags(ai_tags: List[str]) -> str:
    """
    Format AI tags into hashtags.
    Removes spaces and prefixes with #.

    Args:
        ai_tags: List of tag strings

    Returns:
        Space-separated hashtags
    """
    hashtags = [f"#{tag.replace(' ', '')}" for tag in ai_tags]
    return ' '.join(hashtags)


def generate_facebook_copy(metadata: Dict) -> str:
    """Generate Facebook copy following the exact template."""
    hero_stat = extract_hero_stat(metadata['tldr_snapshot']['bullets'][0])
    excerpt = extract_first_sentences(metadata['excerpt'], 2)
    bullet_2 = metadata['tldr_snapshot']['bullets'][1] if len(metadata['tldr_snapshot']['bullets']) > 1 else ""
    url = build_article_url(metadata)
    ai_tags = format_tags(metadata['ai_tags'][:3])

    copy = f"""{hero_stat}

{excerpt}

{bullet_2}

Read the full story: {url}

{ai_tags} #AIinASIA"""

    return copy.strip()


def generate_linkedin_copy(metadata: Dict) -> str:
    """Generate LinkedIn copy following the exact template."""
    hero_stat = extract_hero_stat(metadata['tldr_snapshot']['bullets'][0])
    excerpt = extract_first_sentences(metadata['excerpt'], 2)
    bullets = metadata['tldr_snapshot']['bullets'][:3]
    url = build_article_url(metadata)
    ai_tags = format_tags(metadata['ai_tags'][:3])

    bullet_list = "\n".join([f"▪ {bullet}" for bullet in bullets])

    copy = f"""{hero_stat}

{excerpt}

Key takeaways:
{bullet_list}

{url}

{ai_tags} #AIinASIA #AsiaPacific"""

    return copy.strip()


def generate_twitter_copy(metadata: Dict) -> str:
    """
    Generate Twitter/X copy following the exact template.
    MUST be under 280 characters.
    """
    hero_stat = extract_hero_stat(metadata['tldr_snapshot']['bullets'][0])
    excerpt = extract_first_sentences(metadata['excerpt'], 1)
    url = build_article_url(metadata)
    ai_tags_list = metadata['ai_tags'][:2]
    ai_tags = format_tags(ai_tags_list)

    # Get the full first bullet as hero context
    first_bullet = metadata['tldr_snapshot']['bullets'][0] if metadata['tldr_snapshot']['bullets'] else ""

    # Build the copy and check character count
    copy = f"{first_bullet}\n\n{excerpt}\n\n{url}\n\n{ai_tags} #AIinASIA"

    # If over 280 chars, try without the excerpt
    if len(copy) > 280:
        copy = f"{first_bullet}\n\n{url}\n\n{ai_tags} #AIinASIA"

    # If still over, truncate the bullet
    if len(copy) > 280:
        max_bullet_len = 280 - len(f"\n\n{url}\n\n{ai_tags} #AIinASIA")
        truncated = first_bullet[:max_bullet_len - 3] + "..."
        copy = f"{truncated}\n\n{url}\n\n{ai_tags} #AIinASIA"

    return copy.strip()


def generate_instagram_copy(metadata: Dict) -> str:
    """Generate Instagram copy following the exact template."""
    hero_stat = extract_hero_stat(metadata['tldr_snapshot']['bullets'][0])
    excerpt = extract_first_sentences(metadata['excerpt'], 3)
    bullets = metadata['tldr_snapshot']['bullets'][:3]
    category = metadata.get('category', '').replace(' ', '')
    ai_tags_list = metadata['ai_tags'][:3]
    ai_tags = format_tags(ai_tags_list)

    bullet_list = "\n".join([f"▪ {bullet}" for bullet in bullets])

    copy = f"""{hero_stat}

{excerpt}

{bullet_list}

Read the full breakdown — link in bio

#AI {ai_tags} #AIinASIA #AsiaPacific #TechNews #{category}"""

    return copy.strip()


def generate_tiktok_copy(metadata: Dict) -> str:
    """Generate TikTok/YouTube Shorts copy following the exact template."""
    hero_stat = extract_hero_stat(metadata['tldr_snapshot']['bullets'][0])
    excerpt = extract_first_sentences(metadata['excerpt'], 1)
    bullet_2 = metadata['tldr_snapshot']['bullets'][1] if len(metadata['tldr_snapshot']['bullets']) > 1 else ""
    ai_tags_list = metadata['ai_tags'][:2]
    ai_tags = format_tags(ai_tags_list)

    copy = f"""{hero_stat} 🤯

{excerpt}

{bullet_2}

{ai_tags} #AIinASIA #Shorts"""

    return copy.strip()


def validate_metadata(metadata: Dict) -> List[str]:
    """
    Validate that required fields are present in metadata.

    Args:
        metadata: The article metadata dictionary

    Returns:
        List of error messages (empty if valid)
    """
    errors = []
    required_fields = {
        'title': str,
        'slug': str,
        'excerpt': str,
        'tldr_snapshot': dict,
        'category': str,
        'ai_tags': list,
    }

    for field, expected_type in required_fields.items():
        if field not in metadata:
            errors.append(f"Missing required field: {field}")
        elif not isinstance(metadata[field], expected_type):
            errors.append(f"Field '{field}' should be {expected_type.__name__}, got {type(metadata[field]).__name__}")

    # Check for tldr_snapshot bullets
    if 'tldr_snapshot' in metadata:
        if 'bullets' not in metadata['tldr_snapshot']:
            errors.append("tldr_snapshot must contain 'bullets' array")
        elif not isinstance(metadata['tldr_snapshot']['bullets'], list):
            errors.append("tldr_snapshot.bullets must be an array")
        elif len(metadata['tldr_snapshot']['bullets']) < 2:
            errors.append("tldr_snapshot.bullets must contain at least 2 bullets")

    # Check for ai_tags
    if 'ai_tags' in metadata and len(metadata['ai_tags']) < 3:
        errors.append("ai_tags array must contain at least 3 tags")

    return errors


def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(
        description='Generate platform-specific social media copy for AI in ASIA articles'
    )
    parser.add_argument(
        '--article-metadata',
        required=True,
        help='JSON string containing article metadata'
    )
    parser.add_argument(
        '--output-dir',
        required=True,
        help='Output directory for generated copy files'
    )

    args = parser.parse_args()

    # Parse metadata JSON
    try:
        metadata = json.loads(args.article_metadata)
    except json.JSONDecodeError as e:
        print(f"Error parsing metadata JSON: {e}", file=sys.stderr)
        sys.exit(1)

    # Validate metadata
    validation_errors = validate_metadata(metadata)
    if validation_errors:
        print("Metadata validation failed:", file=sys.stderr)
        for error in validation_errors:
            print(f"  - {error}", file=sys.stderr)
        sys.exit(1)

    # Create output directory
    output_dir = Path(args.output_dir)
    try:
        output_dir.mkdir(parents=True, exist_ok=True)
    except OSError as e:
        print(f"Error creating output directory: {e}", file=sys.stderr)
        sys.exit(1)

    # Generate copy for each platform
    platforms = {
        'facebook_copy.txt': generate_facebook_copy,
        'linkedin_copy.txt': generate_linkedin_copy,
        'twitter_copy.txt': generate_twitter_copy,
        'instagram_copy.txt': generate_instagram_copy,
        'tiktok_copy.txt': generate_tiktok_copy,
    }

    try:
        for filename, generator_func in platforms.items():
            copy = generator_func(metadata)
            output_path = output_dir / filename

            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(copy)

            print(f"✓ Generated {filename}")

        print(f"\nAll copy files generated successfully in {output_dir}")

    except Exception as e:
        print(f"Error generating copy: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
