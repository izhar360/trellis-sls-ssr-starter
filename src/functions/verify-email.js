'use strict'

const emailHelper = require('../../helpers/email')
const db = require('../../helpers/db')
const { response, render } = require('simple-sls-ssr')
const logger = require('../../helpers/logger')

const log = logger('SEQUENCE_VERIFY_EMAIL')

/**
 * @description Takes in verification token after user
 * has clicked their email to verify their email address.
 * Updates their account to say that their email has been
 * verified.
 * @param {*} event
 * @param {*} context
 */
module.exports.verifyEmail = async (event, context) => {
  const {
    pathParameters: {
      token
    }
  } = event

  log.info('STEP_EVENT_INFO_PARSED', { token })

  if (process.env.IS_OFFLINE) {
    log.info('STEP_IS_OFFLINE_SKIPPING_EMAIL_VERIFICATION')
    return response.redirect('../login')
  }

  const {
    data: verifyEmailData,
    error: verifyTokenError
  } = await emailHelper.verifyEmailToken({
    token
  })

  if (verifyTokenError) {
    // TODO Handle expired token
    log.error('ERROR_VERIFYING_TOKEN', { error: verifyTokenError })
    return await render('error', {
      status_code: 400,
      status_message: 'Bad Request',
      details: 'Something went wrong.'
    })
  }

  log.info('STEP_TOKEN_VERIFIED')

  const {
    email,
    chapter,
    type
  } = verifyEmailData

  log.add('userid', `${type}:${email}`)
  log.add('chapter', chapter)

  const docSort = `${type}:${email}`

  const {
    error: dbError
  } = await db.verifyEmail(chapter, docSort)

  if (dbError) {
    log.error('ERROR_UPDATING_ACCOUNT', { error: dbError })

    return await render('error', {
      status_code: 400,
      status_message: 'Bad Request',
      details: 'Something went wrong.'
    })
  }

  log.info('STEP_EMAIL_VERIFIED')

  return response.redirect('../login')
}
