import React, { useCallback, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import format from 'date-fns/format'

import NextLink from 'next/link'

import { logEvent } from '../../utils/ga'

import CommunityBlock from '../Block'
import CommunityButton from '../Button'
import CommunitySection from '../Section'

import { pluralizeComments } from '../../utils/i18n'

import {
  Comments,
  ImageLine,
  Item,
  Items,
  Line,
  Link,
  Meta,
  NbspWrapper,
  Placeholder,
  TextWrapper,
  Wrapper
} from '../styles'

import { Image } from './styles'

import data from '../data'

const { description, mobileDescription, title } = data.section.learn
const { documentation, userContent } = data

const logPostAll = () => logEvent('community', 'blog', 'all')
const logDocumentationAll = () => logEvent('community', 'documentation', 'all')

function CommunityBlogPost({
  url,
  title,
  date,
  color,
  commentsUrl,
  pictureUrl
}) {
  const [count, setCount] = useState()
  const loaded = count !== undefined
  const logPost = useCallback(() => logEvent('community', 'blog', title), [
    title
  ])

  useEffect(() => {
    if (commentsUrl) {
      fetch(`/api/comments?url=${commentsUrl}`)
        .then(result => result.json())
        .then(data => setCount(data.count))
    }
  }, [])

  return (
    <ImageLine key={url}>
      {pictureUrl && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          onClick={logPost}
        >
          <Image src={pictureUrl} alt="" />
        </a>
      )}
      <TextWrapper>
        <Link
          color={color}
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          onClick={logPost}
        >
          {title}
        </Link>
        <Meta>
          {loaded && (
            <>
              <Comments
                href={commentsUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                {pluralizeComments(count)}
              </Comments>
              {' • '}
            </>
          )}
          <NbspWrapper>{format(new Date(date), 'MMM, d')}</NbspWrapper>
        </Meta>
      </TextWrapper>
    </ImageLine>
  )
}

CommunityBlogPost.propTypes = {
  color: PropTypes.string,
  commentsUrl: PropTypes.string,
  pictureUrl: PropTypes.string,
  date: PropTypes.string,
  title: PropTypes.string,
  url: PropTypes.string
}

function CommunityUserContent({ url, title, author, date, color, pictureUrl }) {
  const logUserContent = useCallback(
    () => logEvent('community', 'user-content', title),
    [title]
  )

  return (
    <ImageLine key={url}>
      {pictureUrl && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          onClick={logUserContent}
        >
          <Image src={pictureUrl} alt="" />
        </a>
      )}
      <TextWrapper>
        <Link
          color={color}
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          onClick={logUserContent}
        >
          {title}
        </Link>
        <Meta>
          {author} •{' '}
          <NbspWrapper>{format(new Date(date), 'MMM, d')}</NbspWrapper>
        </Meta>
      </TextWrapper>
    </ImageLine>
  )
}

CommunityUserContent.propTypes = {
  author: PropTypes.string,
  color: PropTypes.string,
  date: PropTypes.string,
  pictureUrl: PropTypes.string,
  title: PropTypes.string,
  url: PropTypes.string
}

function CommunityDocumentation({ url, title, description, color }) {
  const logDocumentation = useCallback(
    () => logEvent('community', 'documentation', title),
    [title]
  )

  return (
    <Line key={url}>
      <NextLink href="/doc" as={url} passHref>
        <Link color={color} large onClick={logDocumentation}>
          {title}
        </Link>
      </NextLink>
      <Meta>{description}</Meta>
    </Line>
  )
}

CommunityDocumentation.propTypes = {
  color: PropTypes.string,
  description: PropTypes.string,
  title: PropTypes.string,
  url: PropTypes.string
}

export default function CommunityLearn({ posts, theme }) {
  return (
    <Wrapper>
      <CommunitySection
        anchor="learn"
        background="/static/img/community/learn_bg.jpg"
        color={theme.color}
        description={description}
        icon="/static/img/community/learn.svg"
        mobileDescription={mobileDescription}
        title={title}
      >
        <Items>
          <Item>
            <CommunityBlock
              title="Documentation"
              action={
                <NextLink href="/doc" passHref>
                  <CommunityButton theme={theme} onClick={logDocumentationAll}>
                    See all docs
                  </CommunityButton>
                </NextLink>
              }
            >
              {documentation.map(documentation => (
                <CommunityDocumentation
                  {...documentation}
                  key={documentation.url}
                  color={theme.color}
                />
              ))}
            </CommunityBlock>
          </Item>
          <Item>
            <CommunityBlock
              title="DVC Blog"
              action={
                posts.length && (
                  <CommunityButton
                    theme={theme}
                    href="https://blog.dvc.org"
                    target="_blank"
                    rel="noreferrer noopener"
                    onClick={logPostAll}
                  >
                    See all Posts
                  </CommunityButton>
                )
              }
            >
              {posts.length ? (
                posts.map(post => (
                  <CommunityBlogPost
                    {...post}
                    key={post.url}
                    color={theme.color}
                  />
                ))
              ) : (
                <Placeholder>Blog is unavailable right now</Placeholder>
              )}
            </CommunityBlock>
          </Item>
          <Item>
            <CommunityBlock title="User Content">
              {userContent.map(userContent => (
                <CommunityUserContent
                  {...userContent}
                  key={userContent.url}
                  color={theme.color}
                />
              ))}
            </CommunityBlock>
          </Item>
        </Items>
      </CommunitySection>
    </Wrapper>
  )
}

CommunityLearn.propTypes = {
  posts: PropTypes.array,
  theme: PropTypes.shape({
    backgroundColor: PropTypes.string,
    color: PropTypes.string
  })
}
