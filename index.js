/*!
 * firestore-toolbox
 *
 * Copyright © 2019 Johannes Berggren <jb@learnlink.no>
 * MIT Licensed
 *
 */

'use strict'

/**
 * Module dependencies.
 *
 * @private
 */
const firebase = require('firebase-admin')

let firestore = {}

/**
 * Connecting to the given Firebase project.
 *
 * @param {JSON} serviceAccountFile
 * @public
 */
exports.setFirebaseConfig = serviceAccountFile => {
  firestore = firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccountFile)
  }, 'firestore-toolbox-instance').firestore()
}

/**
 * Lets you specify a collection, a property name and a value,
 * and populate all documents in the collection with the property.
 *
 * @param {String} collectionName
 * @param {String} propertyName
 * @param {Object|String|number} propertyValue
 * @returns {Promise<Object[]>} Array containing all the responses from Firestore.
 */
exports.addPropertyToAllDocumentsInCollection = (collectionName, propertyName, propertyValue) => {
  return firestore.collection(collectionName).get()
    .then(collectionSnapshot => {
      console.log('Collection ' + collectionName + ' size: ' + collectionSnapshot.size)
      return Promise.all(collectionSnapshot.docs.map(doc => {
        const docID   = doc.id,
              docData = doc.data()

        if (!docData[propertyName]) {
          docData[propertyName] = propertyValue
          updated.push(docID)
          return firestore.collection(collectionName).doc(docID).set(docData)
        }
      }))
    })
}

/**
 * Takes in a collectionName and a propertyName, and converts all the corresponding values
 * from number to String.
 *
 * @param {String} collectionName
 * @param {String} propertyName
 * @returns {Promise<Object[]>} Array containing all the responses from Firestore.
 */
exports.convertPropertyFromNumberToString = (collectionName, propertyName) => {
  return firestore.collection(collectionName).get()
    .then(c => {
      return Promise.all(c.docs.map(d => {
        const ID   = d.id,
              data = d.data()

        if (data[propertyName] === 0 || data[propertyName] === '0') data[propertyName] = ''
        else if (typeof data[propertyName] === 'number') data[propertyName] = data[propertyName] + ''

        return firestore.collection(collectionName).doc(ID).update(data)
      }))
    })
}

/**
 *
 * @param {String} collectionName
 * @param {Array} idList
 * @returns {Promise<Object[]>} Array containing all the responses from Firestore.
 */
exports.deleteDocumentsFromCollection = (collectionName, idList) => {
  if (!Array.isArray(idList)) throw new Error('Parameter idList must be array of strings.')

  return Promise.all(idList.map(documentID => {
    return firestore.collection(collectionName).doc(documentID + '').delete()
  }))
}

/**
 * Renames a collection by running through the current collection, copying all documents
 * to a collection given the new name, and deleting all the documents from the old
 * collection that where successfully copied to the new collection.
 *
 * @param {String} currentName
 * @param {String} newName
 * @returns {Promise<[]>} Promise that resolves with a String-array of all docIDs moved.
 */
exports.renameCollection = (currentName, newName) => {
  const docIDs = []

  return firestore.collection(currentName).get()
    .then(snapshot => {
      return Promise.all(snapshot.docs.map(doc => {
        return firestore.collection(newName).doc(doc.id + '').set(doc.data())
          .then(() => docIDs.push(doc.id))
          .catch(e => console.error(e))
      }))
    })
    .then(() => {
      return Promise.all(docIDs.map(docID => {
        return firestore.collection(req.params.collection).doc(docID + '').delete()
      }))
    })
    .then(() => docIDs)
}
