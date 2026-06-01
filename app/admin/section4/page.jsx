'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Section4Editor from '@/components/admin/Section4Editor'
import Image from 'next/image'

export default function ManageSection4() {
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [editingSection, setEditingSection] = useState(null)

  useEffect(() => {
    fetchSections()
  }, [])

  const fetchSections = async () => {
    try {
      setLoading(true)
      const { data } = await axios.get('/api/admin/section4')
      setSections(data.sections || [])
    } catch (error) {
      console.error('Error fetching sections:', error)
      toast.error('Failed to fetch sections')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingSection(null)
    setShowEditor(true)
  }

  const handleEdit = (section) => {
    setEditingSection(section)
    setShowEditor(true)
  }

  const handleSave = async (formData) => {
    try {
      if (editingSection) {
        await axios.put(`/api/admin/section4/${editingSection._id}`, formData)
        toast.success('Section updated successfully')
      } else {
        await axios.post('/api/admin/section4', formData)
        toast.success('Section created successfully')
      }
      await fetchSections()
      setShowEditor(false)
      setEditingSection(null)
    } catch (error) {
      console.error('Error saving section:', error)
      throw error
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this section?')) return
    
    try {
      await axios.delete(`/api/admin/section4/${id}`)
      toast.success('Section deleted successfully')
      await fetchSections()
    } catch (error) {
      console.error('Error deleting section:', error)
      toast.error('Failed to delete section')
    }
  }

  const handleToggleVisibility = async (section) => {
    try {
      await axios.put(`/api/admin/section4/${section._id}`, {
        ...section,
        visible: !section.visible
      })
      toast.success(section.visible ? 'Section hidden' : 'Section shown')
      await fetchSections()
    } catch (error) {
      console.error('Error toggling visibility:', error)
      toast.error('Failed to update visibility')
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Category Sections</h1>
          <p className="text-gray-600 mt-1">Manage category-based product sections on homepage</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
        >
          <Plus size={20} />
          Add New Section
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading sections...</div>
      ) : sections.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500 mb-4">No sections created yet</p>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Create First Section
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section._id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-gray-900">{section.title}</h3>
                    {!section.visible && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded">
                        Hidden
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 mt-1">
                    Category: <span className="font-semibold">{section.category}</span>
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    Grid Size: {section.gridSize} products ({section.products?.length || 0} added)
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleVisibility(section)}
                    className={`p-2 rounded-lg transition ${
                      section.visible
                        ? 'bg-green-50 text-green-600 hover:bg-green-100'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                    title={section.visible ? 'Hide section' : 'Show section'}
                  >
                    {section.visible ? <Eye size={20} /> : <EyeOff size={20} />}
                  </button>
                  <button
                    onClick={() => handleEdit(section)}
                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                    title="Edit section"
                  >
                    <Edit size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete(section._id)}
                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                    title="Delete section"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              {/* Products Preview */}
              {section.products && section.products.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Products:</p>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {section.products.slice(0, 6).map((product) => (
                      <div key={product._id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="relative aspect-square bg-gray-100">
                          {product.image && (
                            <Image
                              src={product.image}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div className="p-2">
                          <p className="text-xs text-gray-700 line-clamp-2 font-medium">
                            {product.name}
                          </p>
                          {product.discount && (
                            <p className="text-xs text-green-600 font-semibold mt-1">
                              {product.discount}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {section.products.length > 6 && (
                      <div className="border border-gray-200 rounded-lg flex items-center justify-center bg-gray-50">
                        <p className="text-sm text-gray-600 font-semibold">
                          +{section.products.length - 6} more
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <Section4Editor
          section={editingSection}
          onSave={handleSave}
          onClose={() => {
            setShowEditor(false)
            setEditingSection(null)
          }}
        />
      )}
    </div>
  )
}
